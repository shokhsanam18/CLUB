from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Case, When, Value, Prefetch, BooleanField

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Event, EventRegistration, EventReport
from .serializers import (
    EventSerializer, EventListSerializer, EventDetailSerializer,
    EventRegistrationSerializer, EventRegistrationListSerializer,
    EventReportSerializer, BulkAttendanceUpdateSerializer
)
from .permissions import EventPermission, EventReportPermission
from clubs.views import error_response
from core.utils import S3FileUploader

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from datetime import timedelta

import logging

logger = logging.getLogger(__name__)

# Reusable parameter definitions
club_param = openapi.Parameter(
    'club', openapi.IN_QUERY, 
    description="Filter events by club ID", 
    type=openapi.TYPE_INTEGER
)
tag_param = openapi.Parameter(
    'tag', openapi.IN_QUERY, 
    description="Filter events by tag", 
    type=openapi.TYPE_STRING
)
date_from_param = openapi.Parameter(
    'date_from', openapi.IN_QUERY, 
    description="Filter events from this date (YYYY-MM-DD)", 
    type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE
)
date_to_param = openapi.Parameter(
    'date_to', openapi.IN_QUERY, 
    description="Filter events up to this date (YYYY-MM-DD)", 
    type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE
)
time_filter_param = openapi.Parameter(
    'time_filter', openapi.IN_QUERY, 
    description="Filter by time: 'upcoming' or 'past'", 
    type=openapi.TYPE_STRING, enum=['upcoming', 'past']
)
search_param = openapi.Parameter(
    'search', openapi.IN_QUERY, 
    description="Search events by title, description, or club name", 
    type=openapi.TYPE_STRING
)
club_id_param = openapi.Parameter(
    'club_id', openapi.IN_QUERY, 
    description="Club ID for dashboard", 
    type=openapi.TYPE_INTEGER, required=True
)

success_message_response = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'message': openapi.Schema(type=openapi.TYPE_STRING, description="Success message")
    }
)

statistics_response = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'total_registrations': openapi.Schema(type=openapi.TYPE_INTEGER, description="Total number of registrations"),
        'attended_count': openapi.Schema(type=openapi.TYPE_INTEGER, description="Number of attendees"),
        'attendance_rate': openapi.Schema(type=openapi.TYPE_NUMBER, description="Attendance rate percentage"),
        'has_ended': openapi.Schema(type=openapi.TYPE_BOOLEAN, description="Whether the event has ended"),
        'can_submit_report': openapi.Schema(type=openapi.TYPE_BOOLEAN, description="Whether a report can be submitted")
    }
)

dashboard_response = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'created_events_count': openapi.Schema(type=openapi.TYPE_INTEGER),
        'registered_events_count': openapi.Schema(type=openapi.TYPE_INTEGER),
        'upcoming_events_count': openapi.Schema(type=openapi.TYPE_INTEGER),
        'pending_reports_count': openapi.Schema(type=openapi.TYPE_INTEGER),
        'recent_events': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT))
    }
)

club_dashboard_response = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'club_name': openapi.Schema(type=openapi.TYPE_STRING),
        'total_events': openapi.Schema(type=openapi.TYPE_INTEGER),
        'upcoming_events': openapi.Schema(type=openapi.TYPE_INTEGER),
        'past_events': openapi.Schema(type=openapi.TYPE_INTEGER),
        'total_registrations': openapi.Schema(type=openapi.TYPE_INTEGER),
        'pending_reports': openapi.Schema(type=openapi.TYPE_INTEGER),
        'recent_events': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT))
    }
)

attendance_data_response = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'event_title': openapi.Schema(type=openapi.TYPE_STRING),
        'event_date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME),
        'total_registrations': openapi.Schema(type=openapi.TYPE_INTEGER),
        'total_attended': openapi.Schema(type=openapi.TYPE_INTEGER),
        'attendance_data': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'user_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'username': openapi.Schema(type=openapi.TYPE_STRING),
                    'email': openapi.Schema(type=openapi.TYPE_STRING),
                    'attended': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'registration_date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME)
                }
            )
        )
    }
)

class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing events with full CRUD operations and additional actions.
    """
   
    permission_classes = [IsAuthenticatedOrReadOnly, EventPermission]
    parser_classes = [MultiPartParser, JSONParser, FormParser]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return EventListSerializer
        elif self.action == 'retrieve':
            return EventDetailSerializer
        return EventSerializer
    
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
        operation_summary="List all events",
        operation_description="Retrieve a paginated list of events with optional filtering by club, tag, date range, time filter, and search query.",
        manual_parameters=[club_param, tag_param, date_from_param, date_to_param, time_filter_param, search_param],
        responses={
            200: EventListSerializer(many=True),
            401: "Authentication required"
        }
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Retrieve event details",
        operation_description="Get detailed information about a specific event including registrations count and user's registration status.",
        
        responses={
            200: EventDetailSerializer(),
            404: "Event not found",
            401: "Authentication required"
        }
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Create new event",
        operation_description="Create a new event. The authenticated user will be set as the creator.",
        request_body=EventSerializer,
        consumes=['multipart/form-data'],
        responses={
            201: EventSerializer(),
            **EventPermission.get_error_responses('create')
        }
    )
    def create(self, request, *args, **kwargs):
        def _create():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                
                event = serializer.save(created_by=request.user)
                
                
                if 'poster' in request.FILES:
                    try:
                        uploader = S3FileUploader()
                        poster_url = uploader.upload_file(
                            request.FILES['poster'], 
                            'event-posters', 
                            request.user.id
                        )
                        event.poster = poster_url
                        event.save()
                        
                        logger.info(f"Poster uploaded for event '{event.title}'")
                    except Exception as e:
                        logger.error(f"Error uploading poster: {e}")
                        
                        pass
                
                logger.info(f"Event '{event.title}' created by user {request.user.id}")
                
                
                detail_serializer = EventDetailSerializer(event, context={'request': request})
                return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
            
        return self.handle_permission_error(_create)
    
    @swagger_auto_schema(
        operation_summary="Update event",
        operation_description="Update an existing event. Only the creator, club admins, or system admins can update events.",
        request_body=EventSerializer,
        consumes=['multipart/form-data'],
        responses={
            200: EventSerializer(),
            **EventPermission.get_error_responses('update')
        }
    )
    def update(self, request, *args, **kwargs):
        """Update event with optional poster upload."""
        partial = kwargs.pop('partial', False)
        def _update():
            
            event = self.get_object()
            
            
            serializer = self.get_serializer(event, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                # Handle poster upload if provided
                if 'poster' in request.FILES:
                    try:
                        uploader = S3FileUploader()
                        
                        # Delete old poster if exists
                        if hasattr(event, 'poster') and event.poster:
                            uploader.delete_file_from_url(event.poster)
                        
                        # Upload new poster
                        poster_url = uploader.upload_file(
                            request.FILES['poster'], 
                            'event-posters', 
                            request.user.id
                        )
                        event.poster = poster_url
                        
                        logger.info(f"Poster updated for event '{event.title}'")
                    except Exception as e:
                        logger.error(f"Error uploading poster during update: {e}")
                        # Continue with update even if file upload fails
                        pass
                
                updated_event = serializer.save()
                
                logger.info(f"Event '{updated_event.title}' updated by user {request.user.id}")
                
                return Response(serializer.data)
            
        return self.handle_permission_error(_update)
    
    @swagger_auto_schema(
        operation_summary="Partially update event",
        operation_description="Partially update an existing event. Only the creator, club admins, or system admins can update events.",
        request_body=EventSerializer,
        consumes=['multipart/form-data'],
        responses={
            200: EventSerializer(),
            **EventPermission.get_error_responses('partial_update')
        }
    )
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().partial_update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Delete event",
        operation_description="Delete an event. Only the creator, club admins, or system admins can delete events.",
        responses={
            204: "Event deleted successfully",
            **EventPermission.get_error_responses('destroy')
        }
    )
    def destroy(self, request, *args, **kwargs):
        """Delete event with file cleanup."""
        def _destroy():
            event = self.get_object()
            event_title = event.title
            poster_url = getattr(event, 'poster', None)
            
            with transaction.atomic():
                # Delete the event first
                event.delete()
                
                # Delete poster from S3 after successful deletion
                if poster_url:
                    try:
                        uploader = S3FileUploader()
                        uploader.delete_file_from_url(poster_url)
                        logger.info(f"Poster deleted for event '{event_title}'")
                    except Exception as e:
                        logger.error(f"Error deleting poster from S3: {e}")
                        # Don't fail the deletion if S3 cleanup fails
                        pass
                
                logger.info(f"Event '{event_title}' deleted by user {request.user.id}")
                
                return Response(status=status.HTTP_204_NO_CONTENT)
            
        return self.handle_permission_error(_destroy)
            
    def handle_permission_error(self, func, *args, **kwargs):
        """Enhanced helper method to handle all common exceptions."""
        try:
            return func(*args, **kwargs)
        except PermissionError as pe:
            response_data = {
                "error": pe.error,
                "detail": pe.detail,
                "code": pe.code
            }
            response_data.update(pe.extra_data)
            return Response(response_data, status=pe.status_code)
        except PermissionDenied as pd:
            return Response({
                "error": "Permission denied",
                "detail": str(pd) if str(pd) else "You don't have permission to perform this action.",
                "code": "permission_denied"
            }, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as ve:
            logger.error(f"Validation error: {ve}")
            return Response({
                "error": "Validation error",
                "detail": "The provided data failed validation.",
                "code": "validation_error",
                "validation_errors": ve.detail if hasattr(ve, 'detail') else str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return Response({
                "error": "Internal server error",
                "detail": "An unexpected error occurred.",
                "code": "internal_server_error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
    def get_queryset(self):
        """Return filtered queryset based on user permissions and query parameters."""
        if getattr(self, 'swagger_fake_view', False):
            return Event.objects.none()

        action = getattr(self, 'action', None)
        user = getattr(self.request, 'user', None)
	
        print(f"🔍 Total events in DB: {Event.objects.count()}")
        return Event.objects.all()
    
    
    def perform_create(self, serializer):
        """Set the created_by field when creating an event."""
        serializer.save(created_by=self.request.user)
    
    @swagger_auto_schema(
        method='post',
        operation_summary="Register for event",
        operation_description="Register the current user for an event. Users cannot register for past events or events they're already registered for.",
        responses={
            201: EventRegistrationSerializer(),
            **EventPermission.get_error_responses('register_for_event')
        }
    )
    @action(detail=True, methods=['post'], url_path='register')
    def register_for_event(self, request, pk=None):
        """Register current user for an event."""
        def _register_for_event():
            event = self.get_object()

            # Check if event date has passed
            if event.date and event.date < timezone.now():
                return Response(
                    {'error': 'Cannot register for past events.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if user is already registered
            if EventRegistration.objects.filter(event=event, user=request.user).exists():
                return Response(
                    {'error': 'You are already registered for this event.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create registration
            registration = EventRegistration.objects.create(
                event=event,
                user=request.user
            )

            serializer = EventRegistrationSerializer(registration, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return self.handle_permission_error(_register_for_event)
    
    @swagger_auto_schema(
        method='delete',
        operation_summary="Unregister from event",
        operation_description="Remove the current user's registration from an event.",
        responses={
            200: openapi.Response("Success", success_message_response),
            **EventPermission.get_error_responses('unregister_from_event')
        }
    )
    @action(detail=True, methods=['delete'], url_path='unregister')
    def unregister_from_event(self, request, pk=None):
        """Unregister current user from an event."""
        event = self.get_object()
        
        def _unregister_from_event():
            registration = EventRegistration.objects.get(event=event, user=request.user)
            registration.delete()
            return Response({'message': 'Successfully unregistered from event.'})
        
        return self.handle_permission_error(_unregister_from_event)
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get event registrations",
        operation_description="Retrieve all registrations for an event. Only accessible by event creator, club admins, or system admins.",
        responses={
            200: EventRegistrationListSerializer(many=True),
            **EventPermission.get_error_responses('get_registrations')
        }
    )
    @action(detail=True, methods=['get'], url_path='registrations')
    def get_registrations(self, request, pk=None):
        """Get all registrations for an event (admin only)."""
        def _get_registrations():
            event = self.get_object()


            registrations = event.registrations.select_related('user').all()
            serializer = EventRegistrationListSerializer(registrations, many=True)
            return Response(serializer.data)
        
        return self.handle_permission_error(_get_registrations)
    
    @swagger_auto_schema(
        method='post',
        operation_summary="Update attendance",
        operation_description="Bulk update attendance status for event registrations. Only accessible by event creator, club admins, or system admins.",
        request_body=BulkAttendanceUpdateSerializer(),
        responses={
            200: openapi.Response("Success", success_message_response),
            **EventPermission.get_error_responses('update_attendance')
        }
    )
    @action(detail=True, methods=['post'], url_path='attendance')
    def update_attendance(self, request, pk=None):
        """Bulk update attendance for event registrations."""
        def _update_attendance():
            event = self.get_object()



            serializer = BulkAttendanceUpdateSerializer(data=request.data)
            if serializer.is_valid():
                registrations_data = serializer.validated_data["registrations"]

                with transaction.atomic():
                    updated_count = 0
                    for reg_id, attended in registrations_data.items():
                        try:
                            registration = EventRegistration.objects.get(
                                id=reg_id, 
                                event=event
                            )
                            registration.attended = attended.lower() == 'true'
                            registration.save()
                            updated_count += 1
                        except EventRegistration.DoesNotExist:
                            continue
                        
                    return Response({
                        'message': f'Successfully updated attendance for {updated_count} registrations.'
                    })
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        return self.handle_permission_error(_update_attendance)
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get event statistics",
        operation_description="Retrieve statistics for an event including registration count, attendance rate, and report status. Only accessible by event creator, club admins, or system admins.",
        responses={
            200: openapi.Response("Event Statistics", statistics_response),
            **EventPermission.get_error_responses('get_statistics')
        }
    )
    @action(detail=True, methods=['get'], url_path='statistics')
    def get_statistics(self, request, pk=None):
        """Get event statistics."""
        def _get_statistics():
            event = self.get_object()


            total_registrations = event.registrations.count()
            attended_count = event.registrations.filter(attended=True).count()
            attendance_rate = (attended_count / total_registrations * 100) if total_registrations > 0 else 0

            return Response({
                'total_registrations': total_registrations,
                'attended_count': attended_count,
                'attendance_rate': round(attendance_rate, 2),
                'has_ended': event.date and event.date < timezone.now(),
                'can_submit_report': (
                    event.date and 
                    event.date < timezone.now() and 
                    not hasattr(event, 'reports')
                )
            })
        
        return self.handle_permission_error(_get_statistics)

    
class EventRegistrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event registrations.
    """
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_summary="List user registrations",
        operation_description="Retrieve registrations for the current user or all registrations if user is admin.",
        responses={
            200: EventRegistrationListSerializer(many=True),
            401: "Authentication required"
        }
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Create registration",
        operation_description="Create a new event registration for the current user.",
        request_body=EventRegistrationSerializer,
        responses={
            201: EventRegistrationSerializer,
            400: "Validation errors",
            401: "Authentication required"
        }
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Get registration details",
        operation_description="Retrieve details of a specific registration.",
        responses={
            200: EventRegistrationSerializer,
            404: "Registration not found",
            401: "Authentication required"
        }
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Update registration",
        operation_description="Update a registration.",
        request_body=EventRegistrationSerializer,
        responses={
            200: EventRegistrationSerializer,
            400: "Validation errors",
            404: "Registration not found",
            401: "Authentication required"
        }
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Delete registration",
        operation_description="Delete a registration.",
        responses={
            204: "Registration deleted successfully",
            404: "Registration not found",
            401: "Authentication required"
        }
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    def get_queryset(self):
        """Return registrations for the current user or all if admin."""
        if getattr(self, 'swagger_fake_view', False):
            return EventRegistration.objects.none()
    
        user = self.request.user
        action = getattr(self, 'action', None)

        if not user.is_authenticated:
            return EventRegistration.objects.none()

        
        if user.is_staff or user.is_superuser:
            base_queryset = EventRegistration.objects.select_related('event', 'user')
        else:
            base_queryset = EventRegistration.objects.filter(user=user).select_related('event')

        
        event_id = self.request.query_params.get('event', None)
        if event_id:
            base_queryset = base_queryset.filter(event_id=event_id)

        
        if action == 'list':
            
            return base_queryset.select_related(
                'event__club',  
                'user'
            ).order_by('-created_at')

        elif action == 'retrieve':
            
            return base_queryset.select_related(
                'event__club', 
                'event__created_by',  
                'user'
            )

        else:
            return base_queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Set the user field when creating a registration."""
        serializer.save(user=self.request.user)
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get my registrations",
        operation_description="Get current user's registrations with optional time filtering.",
        manual_parameters=[time_filter_param],
        responses={
            200: EventRegistrationSerializer(many=True),
            401: "Authentication required"
        }
    )
    @action(detail=False, methods=['get'], url_path='my-registrations')
    def my_registrations(self, request):
        """Get current user's registrations."""
        registrations = EventRegistration.objects.filter(
            user=request.user
        ).select_related('event', 'event__club')
        
        # Filter by upcoming/past events
        time_filter = request.query_params.get('time_filter', None)
        if time_filter == 'upcoming':
            registrations = registrations.filter(event__date__gte=timezone.now())
        elif time_filter == 'past':
            registrations = registrations.filter(event__date__lt=timezone.now())
        
        serializer = self.get_serializer(registrations, many=True)
        return Response(serializer.data)


class EventReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event reports.
    """
    serializer_class = EventReportSerializer
    permission_classes = [IsAuthenticated, EventReportPermission]
    
    def handle_permission_error(self, func, *args, **kwargs):
        """Enhanced helper method to handle all common exceptions."""
        try:
            return func(*args, **kwargs)
        except PermissionError as pe:
            response_data = {
                "error": pe.error,
                "detail": pe.detail,
                "code": pe.code
            }
            response_data.update(pe.extra_data)
            return Response(response_data, status=pe.status_code)
        except PermissionDenied as pd:
            return Response({
                "error": "Permission denied",
                "detail": str(pd) if str(pd) else "You don't have permission to perform this action.",
                "code": "permission_denied"
            }, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as ve:
            logger.error(f"Validation error: {ve}")
            return Response({
                "error": "Validation error",
                "detail": "The provided data failed validation.",
                "code": "validation_error",
                "validation_errors": ve.detail if hasattr(ve, 'detail') else str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return Response({
                "error": "Internal server error",
                "detail": "An unexpected error occurred.",
                "code": "internal_server_error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
    @swagger_auto_schema(
        operation_summary="List event reports",
        operation_description="Retrieve event reports based on user permissions. Users can see reports for events they created or events in their clubs.",
        responses={
            200: EventReportSerializer(many=True),
            401: "Authentication required"
        }
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Create event report",
        operation_description="Create a new event report. Reports can only be submitted for events that have ended.",
        request_body=EventReportSerializer,
        responses={
            201: EventReportSerializer,
            **EventReportPermission.get_error_responses('create')
        }
    )
    def create(self, request, *args, **kwargs):
        def _create_report():
                return super().create(request, *args, **kwargs)
    
        return self.handle_permission_error(_create_report)
    
    @swagger_auto_schema(
        operation_summary="Get report details",
        operation_description="Retrieve details of a specific event report.",
        responses={
            200: EventReportSerializer,
            404: "Report not found",
            401: "Authentication required"
        }
    )
    def retrieve(self, request, *args, **kwargs):
        def _retrieve_report():
            return super().retrieve(request, *args, **kwargs)
    
        return self.handle_permission_error(_retrieve_report)
    
    @swagger_auto_schema(
        operation_summary="Update event report",
        operation_description="Update an existing event report.",
        request_body=EventReportSerializer,
        responses={
            200: EventReportSerializer,
            **EventReportPermission.get_error_responses('update')
        }
    )
    def update(self, request, *args, **kwargs):
        def _update_report():
            return super().update(request, *args, **kwargs)
    
        return self.handle_permission_error(_update_report)
    
    @swagger_auto_schema(
        operation_summary="Delete event report",
        operation_description="Delete an event report.",
        responses={
            204: "Report deleted successfully",
            **EventReportPermission.get_error_responses('destroy')
        }
    )
    def destroy(self, request, *args, **kwargs):
        def _destroy_report():
            return super().destroy(request, *args, **kwargs)
        return self.handle_permission_error(_destroy_report)
    
    def get_queryset(self):
        """Return reports based on user permissions."""
        if getattr(self, 'swagger_fake_view', False):
            return EventReport.objects.none()

        user = self.request.user
        action = getattr(self, 'action', None)

        if not user.is_authenticated:
            return EventReport.objects.none()

        
        if user.is_staff or user.is_superuser:
            base_queryset = EventReport.objects.select_related(
                'event', 
                'submitted_by',
                'event__club'  
            )
        else:
            base_queryset = EventReport.objects.filter(
                Q(event__created_by=user) |  
                Q(event__club__members=user) |   
                Q(submitted_by=user)  
            ).select_related('event', 'submitted_by', 'event__club').distinct()

        event_id = self.request.query_params.get('event', None)
        if event_id:
            base_queryset = base_queryset.filter(event_id=event_id)

        if action == 'list':
            return base_queryset.only(
                'id', 'created_at', 'submitted_by__username', 
                'event__title', 'event__club__name'
            ).order_by('-created_at')

        elif action == 'retrieve':
            return base_queryset.select_related(
                'event__club__admin',  
                'event__created_by'    
            )

        elif action == 'pending_reports':
            user_club = getattr(user, 'club', None)
            if user_club:
                from django.utils import timezone
                return Event.objects.filter(
                    club=user_club,
                    date__lt=timezone.now() - timedelta(hours=2),  
                ).exclude(
                    id__in=EventReport.objects.values_list('event_id', flat=True)
                ).select_related('club').order_by('-date')
            return Event.objects.none()

        else:
            return base_queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """Set the submitted_by field and validate event has ended."""
        event = serializer.validated_data['event']
        
        # Additional validation: ensure event has ended
        if not event.date or event.date >= timezone.now():
            raise serializers.ValidationError(
                "Reports can only be submitted for events that have ended."
            )
        
        serializer.save(submitted_by=self.request.user)
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get pending reports",
        operation_description="Get events that need reports - ended events without reports that user can submit reports for.",
        responses={
            200: EventListSerializer(many=True),
            **EventReportPermission.get_error_responses('pending_reports')
        }
    )
    @action(detail=False, methods=['get'], url_path='pending')
    def pending_reports(self, request):
        """Get events that need reports (ended events without reports)."""
        def _pending_reports():
            user = request.user

            # Find ended events without reports that user can submit reports for
            ended_events = Event.objects.filter(
                date__lt=timezone.now()
            ).exclude(
                reports__isnull=False
            ).filter(
                created_by=user
                #Q(club__admins=user)
            ).select_related('club').distinct()

            # Use EventListSerializer to return basic event info
            serializer = EventListSerializer(
                ended_events, 
                many=True, 
                context={'request': request}
            )
            return Response(serializer.data)
        
        return self.handle_permission_error(_pending_reports)    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get attendance data for report",
        operation_description="Get detailed attendance data for report generation. Only accessible by event creator, club admins, system admins, or report submitter.",
        responses={
            200: openapi.Response("Attendance Data", attendance_data_response),
            **EventReportPermission.get_error_responses('get_attendance_data')
        }
    )
    @action(detail=True, methods=['get'], url_path='attendance-data')
    def get_attendance_data(self, request, pk=None):
        """Get attendance data for report generation."""
        def _get_attendance_data():
            report = self.get_object()
            event = report.event

            # Check permissions
            user = request.user
            if not (user.is_staff or user.is_superuser or 
                    event.created_by == user or
                    #event.club.admins.filter(id=user.id).exists() 
                    report.submitted_by == user):
                        return Response(
                        {'error': 'You do not have permission to view attendance data for this report.'},
                        status=status.HTTP_403_FORBIDDEN
                )

            registrations = event.registrations.select_related('user').all()
            attendance_data = []

            for reg in registrations:
                attendance_data.append({
                    'user_id': reg.user.id,
                    'username': reg.user.username,
                    'email': reg.user.email,
                    'attended': reg.attended,
                    'registration_date': reg.created_at
                })

            return Response({
                'event_title': event.title,
                'event_date': event.date,
                'total_registrations': len(attendance_data),
                'total_attended': sum(1 for data in attendance_data if data['attended']),
                'attendance_data': attendance_data
            })
            
        return self.handle_permission_error(_get_attendance_data)


# Additional utility views

class EventDashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for dashboard statistics and overview data.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get user dashboard",
        operation_description="Get dashboard data for current user including created events, registrations, and recent activity.",
        responses={
            200: openapi.Response("Dashboard Data", dashboard_response),
            401: "Authentication required"
        }
    )
    @action(detail=False, methods=['get'], url_path='my-dashboard')
    def my_dashboard(self, request):
        """Get dashboard data for current user."""
        user = request.user
        
        # Get user's created events
        created_events = Event.objects.filter(created_by=user)
        
        # Get user's registrations
        user_registrations = EventRegistration.objects.filter(user=user)
        
        # Get events in user's clubs
        user_club_events = Event.objects.filter(
            club__members=user
        ).distinct() if hasattr(user, 'club') else Event.objects.none()
        
        dashboard_data = {
            'created_events_count': created_events.count(),
            'registered_events_count': user_registrations.count(),
            'upcoming_events_count': user_club_events.filter(
                date__gte=timezone.now()
            ).count(),
            'pending_reports_count': created_events.filter(
                date__lt=timezone.now(),
                reports__isnull=True
            ).count(),
            'recent_events': EventListSerializer(
                user_club_events.order_by('-date')[:5],
                many=True,
                context={'request': request}
            ).data
        }
        
        return Response(dashboard_data)
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get club dashboard",
        operation_description="Get dashboard data for a specific club. Only accessible by club admins or system admins.",
        manual_parameters=[club_id_param],
        responses={
            200: openapi.Response("Club Dashboard Data", club_dashboard_response),
            400: openapi.Response("Bad Request - Club ID required", error_response),
            403: openapi.Response("Forbidden - Not club admin", error_response),
            404: openapi.Response("Club not found", error_response),
            401: "Authentication required"
        }
    )
    @action(detail=False, methods=['get'], url_path='club-dashboard')
    def club_dashboard(self, request):
        """Get dashboard data for user's club (admin only)."""
        user = request.user
        club_id = request.query_params.get('club_id')
        
        if not club_id:
            return Response(
                {'error': 'Club ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import Club  # Adjust import as needed
            club = Club.objects.get(id=club_id)
            
            # Check if user is admin of this club
            if not (user.is_staff or user.is_superuser or 
                    club.admins.filter(id=user.id).exists()):
                return Response(
                    {'error': 'You do not have permission to view this club\'s dashboard.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            club_events = Event.objects.filter(club=club)
            
            dashboard_data = {
                'club_name': club.name,
                'total_events': club_events.count(),
                'upcoming_events': club_events.filter(date__gte=timezone.now()).count(),
                'past_events': club_events.filter(date__lt=timezone.now()).count(),
                'total_registrations': EventRegistration.objects.filter(
                    event__club=club
                ).count(),
                'pending_reports': club_events.filter(
                    date__lt=timezone.now(),
                    reports__isnull=True
                ).count(),
                'recent_events': EventListSerializer(
                    club_events.order_by('-date')[:10],
                    many=True,
                    context={'request': request}
                ).data
            }
            
            return Response(dashboard_data)
            
        except Club.DoesNotExist:
            return Response(
                {'error': 'Club not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
