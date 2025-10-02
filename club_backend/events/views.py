from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Event, EventRegistration, EventReport
from .serializers import (
    EventSerializer, EventListSerializer, EventDetailSerializer,
    EventRegistrationSerializer, EventRegistrationListSerializer,
    EventReportSerializer, BulkAttendanceUpdateSerializer
)
from .permissions import EventPermission
from clubs.views import error_response
from core.utils import S3FileUploader

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

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
    permission_classes = [IsAuthenticated, EventPermission]
    parser_classes = [MultiPartParser, JSONParser, FormParser]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return EventListSerializer
        elif self.action == 'retrieve':
            return EventDetailSerializer
        return EventSerializer
    
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
            400: "Validation errors",
            401: "Authentication required"
        }
    )
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                # Save event first
                event = serializer.save(created_by=request.user)
                
                # Handle poster upload if provided
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
                        # Don't fail event creation if poster upload fails
                        pass
                
                logger.info(f"Event '{event.title}' created by user {request.user.id}")
                
                # Return created event
                detail_serializer = EventDetailSerializer(event, context={'request': request})
                return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error creating event: {str(e)}")
            return Response(
                {"error": "Failed to create event"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @swagger_auto_schema(
        operation_summary="Update event",
        operation_description="Update an existing event. Only the creator, club admins, or system admins can update events.",
        request_body=EventSerializer,
        consumes=['multipart/form-data'],
        responses={
            200: EventSerializer(),
            400: "Validation errors",
            403: "Permission denied",
            404: "Event not found"
        }
    )
    def update(self, request, *args, **kwargs):
        """Update event with optional poster upload."""
        try:
            partial = kwargs.pop('partial', False)
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
                
        except Exception as e:
            logger.error(f"Error updating event {kwargs.get('pk')}: {str(e)}")
            return Response(
                {"error": "Failed to update event"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @swagger_auto_schema(
        operation_summary="Partially update event",
        operation_description="Partially update an existing event. Only the creator, club admins, or system admins can update events.",
        request_body=EventSerializer,
        consumes=['multipart/form-data'],
        responses={
            200: EventSerializer(),
            400: "Validation errors",
            403: "Permission denied",
            404: "Event not found"
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
            403: "Permission denied",
            404: "Event not found"
        }
    )
    def destroy(self, request, *args, **kwargs):
        """Delete event with file cleanup."""
        try:
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
                
        except Exception as e:
            logger.error(f"Error deleting event {kwargs.get('pk')}: {str(e)}")
            return Response(
                {"error": "Failed to delete event"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_queryset(self):
        """Return filtered queryset based on user permissions and query parameters."""
        if getattr(self, 'swagger_fake_view', False):
            return Event.objects.none()
        queryset = Event.objects.select_related('club', 'created_by').prefetch_related('registrations')
        
        # Filter by club if specified
        club_id = self.request.query_params.get('club', None)
        if club_id:
            queryset = queryset.filter(club_id=club_id)
        
        # Filter by tag if specified
        tag = self.request.query_params.get('tag', None)
        if tag and tag in Event.EventTag.values:
            queryset = queryset.filter(tag=tag)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        
        # Filter upcoming/past events
        time_filter = self.request.query_params.get('time_filter', None)
        if time_filter == 'upcoming':
            queryset = queryset.filter(date__gte=timezone.now())
        elif time_filter == 'past':
            queryset = queryset.filter(date__lt=timezone.now())
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(club__name__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    
    
    def perform_create(self, serializer):
        """Set the created_by field when creating an event."""
        serializer.save(created_by=self.request.user)
    
    @swagger_auto_schema(
        method='post',
        operation_summary="Register for event",
        operation_description="Register the current user for an event. Users cannot register for past events or events they're already registered for.",
        responses={
            201: EventRegistrationSerializer(),
            400: openapi.Response("Bad Request", error_response),
            401: "Authentication required",
            404: "Event not found"
        }
    )
    @action(detail=True, methods=['post'], url_path='register')
    def register_for_event(self, request, pk=None):
        """Register current user for an event."""
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
    
    @swagger_auto_schema(
        method='delete',
        operation_summary="Unregister from event",
        operation_description="Remove the current user's registration from an event.",
        responses={
            200: openapi.Response("Success", success_message_response),
            400: openapi.Response("Bad Request", error_response),
            401: "Authentication required",
            404: "Event not found"
        }
    )
    @action(detail=True, methods=['delete'], url_path='unregister')
    def unregister_from_event(self, request, pk=None):
        """Unregister current user from an event."""
        event = self.get_object()
        
        try:
            registration = EventRegistration.objects.get(event=event, user=request.user)
            registration.delete()
            return Response({'message': 'Successfully unregistered from event.'})
        except EventRegistration.DoesNotExist:
            return Response(
                {'error': 'You are not registered for this event.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get event registrations",
        operation_description="Retrieve all registrations for an event. Only accessible by event creator, club admins, or system admins.",
        responses={
            200: EventRegistrationListSerializer(many=True),
            403: openapi.Response("Forbidden", error_response),
            404: "Event not found"
        }
    )
    @action(detail=True, methods=['get'], url_path='registrations')
    def get_registrations(self, request, pk=None):
        """Get all registrations for an event (admin only)."""
        event = self.get_object()
        
        
        registrations = event.registrations.select_related('user').all()
        serializer = EventRegistrationListSerializer(registrations, many=True)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        method='post',
        operation_summary="Update attendance",
        operation_description="Bulk update attendance status for event registrations. Only accessible by event creator, club admins, or system admins.",
        request_body=BulkAttendanceUpdateSerializer(),
        responses={
            200: openapi.Response("Success", success_message_response),
            400: "Validation errors",
            403: openapi.Response("Forbidden", error_response),
            404: "Event not found"
        }
    )
    @action(detail=True, methods=['post'], url_path='attendance')
    def update_attendance(self, request, pk=None):
        """Bulk update attendance for event registrations."""
        event = self.get_object()
        
        
        
        serializer = BulkAttendanceUpdateSerializer(data=request.data)
        if serializer.is_valid():
            registrations_data = serializer.validated_data
            
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
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get event statistics",
        operation_description="Retrieve statistics for an event including registration count, attendance rate, and report status. Only accessible by event creator, club admins, or system admins.",
        responses={
            200: openapi.Response("Event Statistics", statistics_response),
            403: openapi.Response("Forbidden", error_response),
            404: "Event not found"
        }
    )
    @action(detail=True, methods=['get'], url_path='statistics')
    def get_statistics(self, request, pk=None):
        """Get event statistics."""
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
            201: EventRegistrationSerializer(),
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
            200: EventRegistrationSerializer(),
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
            200: EventRegistrationSerializer(),
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
        
        if not user.is_authenticated:
            return EventRegistration.objects.none()
        
        if user.is_staff or user.is_superuser:
            qs = EventRegistration.objects.select_related('event', 'user').all()
            
        else:
            qs = EventRegistration.objects.filter(user=user).select_related('event')
        
        event_id = self.request.query_params.get('event', None)
        if event_id:
            qs = qs.filter(event_id=event_id)
        
        return qs
 
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
    permission_classes = [IsAuthenticated]
    
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
            201: EventReportSerializer(),
            400: "Validation errors - event must have ended",
            401: "Authentication required"
        }
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Get report details",
        operation_description="Retrieve details of a specific event report.",
        responses={
            200: EventReportSerializer(),
            404: "Report not found",
            401: "Authentication required"
        }
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Update event report",
        operation_description="Update an existing event report.",
        request_body=EventReportSerializer,
        responses={
            200: EventReportSerializer(),
            400: "Validation errors",
            404: "Report not found",
            401: "Authentication required"
        }
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Delete event report",
        operation_description="Delete an event report.",
        responses={
            204: "Report deleted successfully",
            404: "Report not found",
            401: "Authentication required"
        }
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    def get_queryset(self):
        """Return reports based on user permissions."""
        if getattr(self, 'swagger_fake_view', False):
            return EventReport.objects.none()

        user = self.request.user

        if not user.is_authenticated:
            return EventReport.objects.none()

        if user.is_staff or user.is_superuser:
            queryset = EventReport.objects.select_related('event', 'submitted_by').all()
        else:
            # Users can only see reports for events they created or events in their clubs
            queryset = EventReport.objects.filter(
                Q(event__created_by=user) & Q(event__club__members=user)
            ).select_related('event', 'submitted_by').distinct()

        # Add event filtering
        event_id = self.request.query_params.get('event', None)
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        return queryset
    
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
            401: "Authentication required"
        }
    )
    @action(detail=False, methods=['get'], url_path='pending')
    def pending_reports(self, request):
        """Get events that need reports (ended events without reports)."""
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
    
    @swagger_auto_schema(
        method='get',
        operation_summary="Get attendance data for report",
        operation_description="Get detailed attendance data for report generation. Only accessible by event creator, club admins, system admins, or report submitter.",
        responses={
            200: openapi.Response("Attendance Data", attendance_data_response),
            403: openapi.Response("Forbidden", error_response),
            404: "Report not found"
        }
    )
    @action(detail=True, methods=['get'], url_path='attendance-data')
    def get_attendance_data(self, request, pk=None):
        """Get attendance data for report generation."""
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
