from django.shortcuts import render
from django.contrib.auth import get_user_model

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.db import transaction, models

from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.exceptions import ObjectDoesNotExist

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import (ClubSerializer, ClubMembershipSerializer,
                          ClubCreateSerializer, ClubDetailSerializer,
                          ClubListSerializer, ClubUpdateSerializer,
                          ClubStatsSerializer, JoinRequestCreateSerializer,
                          BulkClubActionSerializer, JoinRequestActionResponseSerializer,
                          JoinRequestActionSerializer, JoinRequestListSerializer)

from .permissions import ClubPermission, JoinRequestPermission

from .models import Club, JoinRequest

from core.utils import S3FileUploader

import logging

from datetime import timezone

logger = logging.getLogger(__name__)

User = get_user_model()

# Response schemas for different serializers
# Pagination wrapper schema for list views
paginated_response = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'count': openapi.Schema(type=openapi.TYPE_INTEGER),
        'next': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_URI, nullable=True),
        'previous': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_URI, nullable=True),
        'results': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT))
    }
)

# Error response schema
error_response = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'error': openapi.Schema(type=openapi.TYPE_STRING),
        'message': openapi.Schema(type=openapi.TYPE_STRING),
    }
)
# Create your views here.

class ClubViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet for Club CRUD operations with custom permissions and advanced features.
    
    Endpoints:
    - GET /clubs/ - List all clubs (with filtering, search, pagination)
    - POST /clubs/ - Create a new club
    - GET /clubs/{id}/ - Retrieve specific club details
    - PUT/PATCH /clubs/{id}/ - Update club
    - DELETE /clubs/{id}/ - Delete club
    - POST /clubs/{id}/join/ - Join a club
    - POST /clubs/{id}/leave/ - Leave a club
    - GET /clubs/{id}/stats/ - Get club statistics
    - POST /clubs/bulk-action/ - Bulk operations (admin only)
    """
    
    queryset = Club.objects.select_related().prefetch_related('members', 'events')
    permission_classes = [IsAuthenticated, ClubPermission, JoinRequestPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    # Filtering and search
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['university', 'club_points']
    search_fields = ['name', 'description', 'university']
    ordering_fields = ['name', 'created_at', 'club_points', 'total_events']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ClubListSerializer
        elif self.action == 'retrieve':
            return ClubDetailSerializer
        elif self.action == 'create':
            return ClubCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ClubUpdateSerializer
        elif self.action == 'stats':
            return ClubStatsSerializer
        elif self.action in ['join', 'leave']:
            return ClubMembershipSerializer
        elif self.action == 'bulk_action':
            return BulkClubActionSerializer
        elif self.action == 'join_requests':
            return JoinRequestListSerializer
        elif self.action in ['approve_join_request', 'reject_join_request']:
            return JoinRequestActionSerializer
        return ClubSerializer

    def get_queryset(self):
        """Optimize queryset based on action and user permissions."""
        queryset = self.queryset
        
        # Add annotations for computed fields
        queryset = queryset.annotate(
        member_count=models.Count(
            'members', 
            filter=models.Q(members__is_active=True),  
            distinct=True
        ),
    )
        
        # Apply filters based on user role and permissions
        user = self.request.user
        if user.is_authenticated:
            role = self.get_user_role(user)
            
            if role == 'member':
                # Regular members can see all public clubs + clubs from their university
                if hasattr(user, 'university') and user.university:
                    queryset = queryset.filter(
                        #Q(is_public=True) | 
                        university=user.university
                    )
            elif role in ['volunteer', 'ambassador']:
                # Volunteers/ambassadors can see clubs from their university
                if hasattr(user, 'university') and user.university:
                    queryset = queryset.filter(university=user.university)
            # Superadmins can see all clubs (no filter applied)
        
        return queryset.distinct()

    def get_user_role(self, user):
        """Helper method to get user role (reused from your permission system)."""
        if not user or not user.is_authenticated:
            return 'anonymous'
        
        user_groups = list(user.groups.values_list('name', flat=True))
        role_hierarchy = ['Superadmin', 'Ambassador', 'Volunteer', 'Member']
        
        for role in role_hierarchy:
            if role in user_groups:
                return role.lower()
        return 'member'
    
    @swagger_auto_schema(
        operation_summary="List all clubs",
        operation_description="Retrieve a paginated list of clubs with optional filtering and search",
        manual_parameters=[
            openapi.Parameter(
                'search',
                openapi.IN_QUERY,
                description="Search in club name, description, or university",
                type=openapi.TYPE_STRING
            ),
            openapi.Parameter(
                'university',
                openapi.IN_QUERY,
                description="Filter by university",
                type=openapi.TYPE_STRING
            ),
            openapi.Parameter(
                'club_points',
                openapi.IN_QUERY,
                description="Filter by club points",
                type=openapi.TYPE_INTEGER
            ),
            openapi.Parameter(
                'ordering',
                openapi.IN_QUERY,
                description="Sort by fields: name, created_at, club_points, total_events",
                type=openapi.TYPE_STRING
            ),
        ],
        responses={
            200: ClubListSerializer(many=True),  # Using your actual serializer
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def list(self, request, *args, **kwargs):
        """
        List clubs with optional filtering and search.
        
        Query parameters:
        - search: Search in name, description, university
        - university: Filter by university
        - club_points: Filter by points range
        - ordering: Sort by fields (name, created_at, club_points, total_events)
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error listing clubs: {str(e)}")
            return Response(
                {"error": "Failed to retrieve clubs"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @swagger_auto_schema(
        operation_summary="Create a new club",
        operation_description="Create a new club with validation and permission checks",
        request_body=ClubCreateSerializer, 
        consumes=['multipart/form-data'],
        responses={
            201: ClubDetailSerializer,  # Return detailed view after creation
            400: openapi.Response(description="Validation error", schema=error_response),
            403: openapi.Response(description="Permission denied", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def create(self, request, *args, **kwargs):
        """Create a new club with validation and permission checks."""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Additional business logic validation
            self.validate_club_creation(request.user, serializer.validated_data)
            
            with transaction.atomic():
                club = serializer.save()
                
                if 'logo' in request.FILES:
                    try:
                        uploader = S3FileUploader()
                        logo_url = uploader.upload_file(
                            request.FILES['logo'], 
                            'club-logos', 
                            request.user.id
                        )
                        club.logo = logo_url
                        club.save()
                        
                        logger.info(f"Logo uploaded for club '{club.name}'")
                    except Exception as e:
                        logger.error(f"Error uploading logo: {e}")
                        pass
                
                # Add creator-specific logic
                self.post_create_setup(club, request.user)
                
                logger.info(f"Club '{club.name}' created by user {request.user.id}")
                
                # Return detailed serializer for created object
                detail_serializer = ClubDetailSerializer(club, context={'request': request})
                return Response(
                    detail_serializer.data,
                    status=status.HTTP_201_CREATED
                )
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error creating club: {str(e)}")
            return Response(
                {"error": "Failed to create club"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @swagger_auto_schema(
        operation_summary="Get club details",
        operation_description="Retrieve detailed information about a specific club",
        responses={
            200: ClubDetailSerializer,  # Using your actual serializer
            404: openapi.Response(description="Club not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve club details with permission checks."""
        try:
            logger.info(f"View retrieve method called for club {kwargs.get('pk')}")
            club = self.get_object()
            serializer = self.get_serializer(club)
            return Response(serializer.data)
        except ObjectDoesNotExist:
            return Response(
                {"error": "Club not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error retrieving club {kwargs.get('pk')}: {str(e)}")
            return Response(
                {"error": "Failed to retrieve club"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @swagger_auto_schema(
        operation_summary="Update club",
        operation_description="Update club information with validation and permission checks",
        request_body=ClubUpdateSerializer, 
        consumes=['multipart/form-data'],
        responses={
            200: ClubDetailSerializer,  # Return detailed view after update
            400: openapi.Response(description="Validation error", schema=error_response),
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="Club not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def update(self, request, *args, **kwargs):
        """Update club with validation and permission checks."""
        try:
            partial = kwargs.pop('partial', False)
            club = self.get_object()
            
            serializer = self.get_serializer(club, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            
            # Additional validation for updates
            self.validate_club_update(request.user, club, serializer.validated_data)
            
            with transaction.atomic():
                updated_club = serializer.save()
                
                if 'logo' in request.FILES:
                    try:
                        uploader = S3FileUploader()
                        
                        # Delete old logo if exists
                        if club.logo:
                            uploader.delete_file_from_url(club.logo)
                        
                        # Upload new logo
                        logo_url = uploader.upload_file(
                            request.FILES['logo'], 
                            'club-logos', 
                            request.user.id
                        )
                        club.logo = logo_url
                        
                        logger.info(f"Logo updated for club '{club.name}'")
                    except Exception as e:
                        logger.error(f"Error uploading logo during update: {e}")
                        # Continue with update even if file upload fails
                        pass
                
                logger.info(f"Club '{updated_club.name}' updated by user {request.user.id}")
                
                # Return updated object
                detail_serializer = ClubDetailSerializer(updated_club, context={'request': request})
                return Response(detail_serializer.data)
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error updating club {kwargs.get('pk')}: {str(e)}")
            return Response(
                {"error": "Failed to update club"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @swagger_auto_schema(
        operation_summary="Delete club",
        operation_description="Delete a club with cascade handling and permission checks",
        responses={
            204: openapi.Response(
                description="Club deleted successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={'message': openapi.Schema(type=openapi.TYPE_STRING)}
                )
            ),
            400: openapi.Response(description="Cannot delete club", schema=error_response),
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="Club not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def destroy(self, request, *args, **kwargs):
        """Delete club with cascade handling and permission checks."""
        try:
            club = self.get_object()
            
            # Additional validation before deletion
            self.validate_club_deletion(request.user, club)
            
            club_name = club.name
            club_id = club.id
            logo_url = club.logo
            
            with transaction.atomic():
                # Handle cascade deletions and cleanup
                self.pre_delete_cleanup(club)
                club.delete()
                
                if logo_url:
                    try:
                        uploader = S3FileUploader()
                        uploader.delete_file_from_url(logo_url)
                        logger.info(f"Logo deleted for club '{club_name}'")
                    except Exception as e:
                        logger.error(f"Error deleting logo from S3: {e}")
                        # Don't fail the deletion if S3 cleanup fails
                        pass
                
                logger.info(f"Club '{club_name}' (ID: {club_id}) deleted by user {request.user.id}")
                
                return Response(
                    {"message": f"Club '{club_name}' successfully deleted"},
                    status=status.HTTP_204_NO_CONTENT
                )
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error deleting club {kwargs.get('pk')}: {str(e)}")
            return Response(
                {"error": "Failed to delete club"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            

    @action(detail=True, methods=['post'], url_path='join')    
    @swagger_auto_schema(
        operation_summary="Join a club",
        operation_description="Submit a join request for a club",
        request_body=openapi.Schema(type=openapi.TYPE_OBJECT, properties={}),  # Empty body
        responses={
            200: openapi.Response(
                description="Join request resubmitted",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'request_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'status': openapi.Schema(type=openapi.TYPE_STRING),
                        'club_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'club_name': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                )
            ),
            201: openapi.Response(
                description="Join request submitted successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'request_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'status': openapi.Schema(type=openapi.TYPE_STRING),
                        'club_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'club_name': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                )
            ),
            400: openapi.Response(
                description="Bad request - already member or pending request",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'error': openapi.Schema(type=openapi.TYPE_STRING),
                        'request_id': openapi.Schema(type=openapi.TYPE_INTEGER, nullable=True),
                        'status': openapi.Schema(type=openapi.TYPE_STRING, nullable=True),
                    }
                )
            ),
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="Club not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def join(self, request, pk=None):
        """Submit a join request for a club."""
        try:
            club = self.get_object()
            
            # Create JoinRequestPermission instance for permission checking
            join_request_permission = JoinRequestPermission()
            
            logger.info(f"=== Checking join permission ===")
            logger.info(f"User: {request.user}")
            logger.info(f"User groups: {list(request.user.groups.values_list('name', flat=True))}")
            logger.info(f"Club: {club}")
            
            permission_result = join_request_permission.check_permission(
                request.user,
                'clubs',  # app_label
                'add_joinrequest',  # Django permission
                'add_joinrequest',   # Business rule action
                club  # Target object for business rules
            )
            
            logger.info(f"Join permission result: {permission_result}")
            
            if not permission_result:
                logger.warning(f"Permission denied for join request")
                return Response({
                    "error": "Permission denied",
                    "message": "You don't have permission to submit join requests for this club"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if user already has a pending/approved request
            existing_request = JoinRequest.objects.filter(
                user=request.user, 
                club=club
            ).first()
            
            if existing_request:
                if existing_request.status == JoinRequest.STATUS.PENDING:
                    return Response({
                        "error": "You already have a pending join request for this club",
                        "request_id": existing_request.id,
                        "status": existing_request.status
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                elif existing_request.status == JoinRequest.STATUS.APPROVED:
                    return Response({
                        "error": "You are already a member of this club",
                        "request_id": existing_request.id,
                        "status": existing_request.status
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                elif existing_request.status == JoinRequest.STATUS.REJECTED:
                    # Check permission to resubmit rejected requests
                    if not join_request_permission.check_permission(
                        request.user,
                        'add_joinrequest',
                        'resubmit_join_request',
                        existing_request
                    ):
                        return Response({
                            "error": "Permission denied",
                            "message": "You don't have permission to resubmit this join request"
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                    # Allow resubmission after rejection
                    existing_request.status = JoinRequest.STATUS.PENDING
                    existing_request.save()
                    
                    logger.info(f"User {request.user.id} resubmitted join request for club '{club.name}'")
                    
                    return Response({
                        "message": f"Join request resubmitted for '{club.name}'",
                        "request_id": existing_request.id,
                        "status": existing_request.status,
                        "club_id": club.id,
                        "club_name": club.name
                    }, status=status.HTTP_200_OK)
            
            # Additional validation using business rules
            self.validate_join_request(request.user, club)
            
            # Create new join request
            data = {'club': club.id}
            serializer = JoinRequestCreateSerializer(data=data, context={'request': request})
            
            if serializer.is_valid():
                join_request = serializer.save()
                
                logger.info(f"User {request.user.id} submitted join request for club '{club.name}'")
                
                return Response({
                    "message": f"Join request submitted for '{club.name}'. Waiting for ambassador approval.",
                    "request_id": join_request.id,
                    "status": join_request.status,
                    "club_id": club.id,
                    "club_name": club.name
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionDenied as e:
            return Response({
                "error": "Permission denied",
                "message": str(e)
            }, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error submitting join request for club {pk}: {str(e)}")
            return Response(
                {"error": "Failed to submit join request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='leave')
    @swagger_auto_schema(
        operation_summary="Leave a club",
        operation_description="Leave a club membership",
        request_body=ClubMembershipSerializer,  
        responses={
            200: openapi.Response(
                description="Successfully left the club",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'club_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'club_name': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                )
            ),
            400: openapi.Response(description="Not a member of the club", schema=error_response),
            404: openapi.Response(description="Club not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def leave(self, request, pk=None):
        """Leave a club."""
        try:
            club = self.get_object()
            
            # Check if user is actually a member
            if not club.members.filter(id=request.user.id).exists():
                return Response(
                    {"error": "You are not a member of this club"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Prepare data for membership serializer
            data = {'action': 'leave', 'club_id': club.id}
            serializer = ClubMembershipSerializer(data=data, context={'request': request})
            
            if serializer.is_valid():
                result = serializer.save()
                
                logger.info(f"User {request.user.id} left club '{club.name}'")
                
                return Response({
                    "message": f"Successfully left '{club.name}'",
                    "club_id": club.id,
                    "club_name": club.name
                }, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error leaving club {pk}: {str(e)}")
            return Response(
                {"error": "Failed to leave club"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


    @action(detail=True, methods=['get'], url_path='stats')
    @swagger_auto_schema(
        operation_summary="Get club statistics",
        operation_description="Retrieve club statistics and analytics (requires appropriate permissions)",
        responses={
            200: ClubStatsSerializer,  # Using your actual serializer
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="Club not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def stats(self, request, pk=None):
        """Get club statistics and analytics."""
        try:
            club = self.get_object()
            
            # Check if user has permission to view stats
            if not self.can_view_club_stats(request.user, club):
                raise PermissionDenied("You don't have permission to view club statistics")
            
            serializer = self.get_serializer(club)
            return Response(serializer.data)
            
        except PermissionDenied:
            raise
        except Exception as e:
            logger.error(f"Error retrieving stats for club {pk}: {str(e)}")
            return Response(
                {"error": "Failed to retrieve club statistics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='bulk-action')
    @swagger_auto_schema(
        operation_summary="Bulk operations on clubs",
        operation_description="Perform bulk operations on multiple clubs (admin only)",
        request_body=BulkClubActionSerializer,  
        responses={
            200: openapi.Response(
                description="Bulk operation completed",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'affected_clubs': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'results': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                properties={
                                    'club_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                                    'status': openapi.Schema(type=openapi.TYPE_STRING),
                                    'error': openapi.Schema(type=openapi.TYPE_STRING, nullable=True),
                                }
                            )
                        )
                    }
                )
            ),
            400: openapi.Response(description="Validation error", schema=error_response),
            403: openapi.Response(description="Permission denied", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['clubs']
    )
    def bulk_action(self, request):
        """Perform bulk operations on clubs (admin only)."""
        try:
            serializer = BulkClubActionSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                club_ids = serializer.validated_data['club_ids']
                action = serializer.validated_data['action']
                
                with transaction.atomic():
                    clubs = Club.objects.filter(id__in=club_ids)
                    results = self.execute_bulk_action(clubs, action, request.user)
                    
                    logger.info(f"Bulk action '{action}' performed on {len(clubs)} clubs by user {request.user.id}")
                    
                    return Response({
                        "message": f"Bulk {action} completed successfully",
                        "affected_clubs": len(clubs),
                        "results": results
                    })
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error performing bulk action: {str(e)}")
            return Response(
                {"error": "Failed to perform bulk action"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='join-requests')
    @swagger_auto_schema(
        operation_summary="Get club join requests",
        operation_description="Retrieve all join requests for a specific club (ambassadors and superadmins only)",
        manual_parameters=[
            openapi.Parameter(
                'status',
                openapi.IN_QUERY,
                description="Filter by request status (pending, approved, rejected)",
                type=openapi.TYPE_STRING,
                enum=['pending', 'approved', 'rejected']
            ),
            openapi.Parameter(
                'ordering',
                openapi.IN_QUERY,
                description="Sort by fields: created_at, status, user__username",
                type=openapi.TYPE_STRING
            ),
        ],
        responses={
            200: JoinRequestListSerializer(many=True),
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="Club not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['join-requests']
    )
    def join_requests(self, request, pk=None):
        """Get join requests for a specific club (ambassadors and superadmins only)."""
        try:
            club = self.get_object()
            user = request.user
            user_role = self.get_user_role(user)
            
            # Permission check - only ambassadors and superadmins can view join requests
            if user_role == 'superadmin':
                # Superadmins can see all join requests
                pass
            elif user_role == 'ambassador':
                # Ambassadors can only see join requests from their university
                if not (hasattr(user, 'university') and user.university == club.university):
                    raise PermissionDenied("You can only view join requests for clubs from your university")
            else:
                raise PermissionDenied("You don't have permission to view join requests")
            
            # Get all join requests for this club
            join_requests = JoinRequest.objects.filter(club=club).select_related(
                'user').order_by('-created_at')
            
            # Apply status filtering if provided
            status_filter = request.query_params.get('status')
            if status_filter and status_filter == 'approved':
                join_requests = join_requests.filter(status=status_filter)
            
            # Apply ordering if provided
            ordering = request.query_params.get('ordering')
            valid_ordering_fields = ['created_at', '-created_at', 'status', '-status', 
                                   'user__username', '-user__username']
            if ordering and ordering in valid_ordering_fields:
                join_requests = join_requests.order_by(ordering)
            
            # Paginate results
            page = self.paginate_queryset(join_requests)
            if page is not None:
                serializer = JoinRequestListSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = JoinRequestListSerializer(join_requests, many=True)
            return Response(serializer.data)
            
        except PermissionDenied:
            raise
        except Exception as e:
            logger.error(f"Error retrieving join requests for club {pk}: {str(e)}")
            return Response(
                {"error": "Failed to retrieve join requests"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    
    @action(detail=True, methods=['post'], url_path='join-requests/(?P<request_id>[^/.]+)/approve')
    @swagger_auto_schema(
        operation_summary="Approve join request",
        operation_description="Approve a specific join request (ambassadors and superadmins only)",
        request_body=JoinRequestActionSerializer,
        responses={
            200: JoinRequestActionResponseSerializer,
            400: openapi.Response(description="Join request cannot be approved", schema=error_response),
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="Join request not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['join-requests']
    )
    def approve_join_request(self, request, pk=None, request_id=None):
        """Approve a specific join request."""
        try:
            club = self.get_object()
            user = request.user
            user_role = self.get_user_role(user)
            
            # Permission check
            if user_role == 'superadmin':
                pass
            elif user_role == 'ambassador':
                if not (hasattr(user, 'university') and user.university == club.university):
                    raise PermissionDenied("You can only approve join requests for clubs from your university")
            else:
                raise PermissionDenied("You don't have permission to approve join requests")
            
            # Get the specific join request
            try:
                join_request = JoinRequest.objects.select_related('user', 'club').get(
                    id=request_id, 
                    club=club
                )
            except JoinRequest.DoesNotExist:
                return Response(
                    {"error": "Join request not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if request can be approved
            if join_request.status != JoinRequest.STATUS.PENDING:
                return Response(
                    {"error": f"Join request is already {join_request.status}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate request data
            serializer = JoinRequestActionSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Additional validation - check if user is already a member
            if club.members.filter(id=join_request.user.id).exists():
                return Response(
                    {"error": "User is already a member of this club"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Approve the join request
                join_request.approve(approving_user=user)
                
                logger.info(f"Join request {request_id} approved by user {user.id} for club '{club.name}'")
                
                return Response({
                    "message": f"Join request approved successfully. {join_request.user.get_full_name()} is now a member of '{club.name}'",
                    "request_id": join_request.id,
                    "user": {
                        "id": join_request.user.id,
                        "username": join_request.user.username,
                        "first_name": join_request.user.first_name,
                        "last_name": join_request.user.last_name,
                    },
                    "club": {
                        "id": club.id,
                        "name": club.name,
                    },
                    "status": join_request.status
                })
                
        except PermissionDenied:
            raise
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error approving join request {request_id}: {str(e)}")
            return Response(
                {"error": "Failed to approve join request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    
    @action(detail=True, methods=['post'], url_path='join-requests/(?P<request_id>[^/.]+)/reject')
    @swagger_auto_schema(
        operation_summary="Reject join request",
        operation_description="Reject a specific join request (ambassadors and superadmins only)",
        request_body=JoinRequestActionSerializer,
        responses={
            200: JoinRequestActionResponseSerializer,
            400: openapi.Response(description="Join request cannot be rejected", schema=error_response),
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="Join request not found", schema=error_response),
            500: openapi.Response(description="Server error", schema=error_response)
        },
        tags=['join-requests']
    )
    def reject_join_request(self, request, pk=None, request_id=None):
        """Reject a specific join request."""
        try:
            club = self.get_object()
            user = request.user
            user_role = self.get_user_role(user)
            
            # Permission check
            if user_role == 'superadmin':
                pass
            elif user_role == 'ambassador':
                if not (hasattr(user, 'university') and user.university == club.university):
                    raise PermissionDenied("You can only reject join requests for clubs from your university")
            else:
                raise PermissionDenied("You don't have permission to reject join requests")
            
            # Get the specific join request
            try:
                join_request = JoinRequest.objects.select_related('user', 'club').get(
                    id=request_id, 
                    club=club
                )
            except JoinRequest.DoesNotExist:
                return Response(
                    {"error": "Join request not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if request can be rejected
            if join_request.status != JoinRequest.STATUS.PENDING:
                return Response(
                    {"error": f"Join request is already {join_request.status}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate request data
            serializer = JoinRequestActionSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Reject the join request
                join_request.reject(rejecting_user=user)
                
                logger.info(f"Join request {request_id} rejected by user {user.id} for club '{club.name}'")
                
                return Response({
                    "message": f"Join request rejected. {join_request.user.get_full_name()}'s request to join '{club.name}' has been declined",
                    "request_id": join_request.id,
                    "user": {
                        "id": join_request.user.id,
                        "username": join_request.user.username,
                        "first_name": join_request.user.first_name,
                        "last_name": join_request.user.last_name,
                    },
                    "club": {
                        "id": club.id,
                        "name": club.name,
                    },
                    "status": join_request.status
                })
                
        except PermissionDenied:
            raise
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error rejecting join request {request_id}: {str(e)}")
            return Response(
                {"error": "Failed to reject join request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # Helper methods for validation and business logic
    def validate_join_request(self, user, club):
        """Additional validation for join requests."""
        # Check if user already belongs to another club
        if hasattr(user, 'club') and user.club and user.club != club:
            raise ValidationError("You are already a member of another club. Leave your current club first.")
        
        # Check university match
        if hasattr(user, 'university') and hasattr(club, 'university'):
            if club.university != user.university:
                raise ValidationError("You can only join clubs from your university.")
        
        # Check club capacity (if applicable)
        max_members = getattr(club, 'max_members', None)
        if max_members and club.member_count >= max_members:
            raise ValidationError("Club has reached maximum capacity.")
    
    def validate_club_creation(self, user, validated_data):
        """Additional validation for club creation."""
        role = self.get_user_role(user)
        
        if role not in ['superadmin', 'ambassador']:
            raise ValidationError("You don't have permission to create clubs")
        
        # Limit club creation per user (if needed)
        # user_created_clubs = Club.objects.filter(created_by=user).count()
        # if role != 'superadmin' and user_created_clubs >= 3:  # Adjust limit as needed
        #     raise ValidationError("You have reached the maximum number of clubs you can create")

    def validate_club_update(self, user, club, validated_data):
        """Additional validation for club updates."""
        # Add business-specific validation here
        pass

    def validate_club_deletion(self, user, club):
        """Additional validation for club deletion."""
        # Prevent deletion if club has active events
        if club.events.filter(date__gte=timezone.now()).exists():
            raise ValidationError("Cannot delete club with upcoming events")
        
        # Check if club has members
        if club.members.exists():
            raise ValidationError("Cannot delete club with existing members")

    def post_create_setup(self, club, creator):
        """Setup tasks after club creation."""
        # Add creator as admin or member
        if hasattr(creator, 'club'):
            creator.club = club
            creator.save()

    def pre_delete_cleanup(self, club):
        """Cleanup tasks before club deletion."""
        # Remove club references from users
        club.members.clear()

    def can_view_club_stats(self, user, club):
        """Check if user can view club statistics."""
        role = self.get_user_role(user)
        
        if role == 'superadmin':
            return True
        elif role == 'ambassador':
            return user.university == club.university
        elif role == 'volunteer':
            return user.club == club
        
        return False

    def execute_bulk_action(self, clubs, action, user):
        """Execute bulk action on clubs."""
        results = []
        
        for club in clubs:
            try:
                if action == 'activate':
                    club.is_active = True
                elif action == 'deactivate':
                    club.is_active = False
                elif action == 'archive':
                    club.is_archived = True
                
                club.save()
                results.append({"club_id": club.id, "status": "success"})
            except Exception as e:
                results.append({"club_id": club.id, "status": "error", "error": str(e)})
        
        return results

    def handle_exception(self, exc):
        """Custom error handling."""
        if isinstance(exc, PermissionDenied):
            return Response(
                {
                    "error": "Permission denied",
                    "message": str(exc),
                    "code": "club_permission_denied"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().handle_exception(exc)
