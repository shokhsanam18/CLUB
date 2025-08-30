from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count

from .models import Event, EventRegistration, EventReport
from .serializers import (
    EventSerializer, EventListSerializer, EventDetailSerializer,
    EventRegistrationSerializer, EventRegistrationListSerializer,
    EventReportSerializer, BulkAttendanceUpdateSerializer
)
from .permissions import EventPermission


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing events with full CRUD operations and additional actions.
    """
    permission_classes = [IsAuthenticated, EventPermission]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return EventListSerializer
        elif self.action == 'retrieve':
            return EventDetailSerializer
        return EventSerializer
    
    def get_queryset(self):
        """Return filtered queryset based on user permissions and query parameters."""
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
    
    @action(detail=True, methods=['get'], url_path='registrations')
    def get_registrations(self, request, pk=None):
        """Get all registrations for an event (admin only)."""
        event = self.get_object()
        
        # Check permissions
        user = request.user
        if not (user.is_staff or user.is_superuser or 
                event.created_by == user or
                event.club.admins.filter(id=user.id).exists()):
            return Response(
                {'error': 'You do not have permission to view registrations for this event.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        registrations = event.registrations.select_related('user').all()
        serializer = EventRegistrationListSerializer(registrations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='attendance')
    def update_attendance(self, request, pk=None):
        """Bulk update attendance for event registrations."""
        event = self.get_object()
        
        # Check permissions
        user = request.user
        if not (user.is_staff or user.is_superuser or 
                event.created_by == user or
                event.club.admins.filter(id=user.id).exists()):
            return Response(
                {'error': 'You do not have permission to update attendance for this event.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BulkAttendanceUpdateSerializer(data=request.data)
        if serializer.is_valid():
            registrations_data = serializer.validated_data['registrations']
            
            with transaction.atomic():
                updated_count = 0
                for reg_data in registrations_data:
                    try:
                        registration = EventRegistration.objects.get(
                            id=reg_data['id'], 
                            event=event
                        )
                        registration.attended = reg_data['attended'].lower() == 'true'
                        registration.save()
                        updated_count += 1
                    except EventRegistration.DoesNotExist:
                        continue
                
                return Response({
                    'message': f'Successfully updated attendance for {updated_count} registrations.'
                })
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='statistics')
    def get_statistics(self, request, pk=None):
        """Get event statistics."""
        event = self.get_object()
        
        # Check permissions
        user = request.user
        if not (user.is_staff or user.is_superuser or 
                event.created_by == user or
                event.club.admins.filter(id=user.id).exists()):
            return Response(
                {'error': 'You do not have permission to view statistics for this event.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
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
    
    def get_queryset(self):
        """Return registrations for the current user or all if admin."""
        user = self.request.user
        
        if user.is_staff or user.is_superuser:
            return EventRegistration.objects.select_related('event', 'user').all()
        else:
            return EventRegistration.objects.filter(user=user).select_related('event')
    
    def perform_create(self, serializer):
        """Set the user field when creating a registration."""
        serializer.save(user=self.request.user)
    
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
    
    def get_queryset(self):
        """Return reports based on user permissions."""
        user = self.request.user
        
        if user.is_staff or user.is_superuser:
            return EventReport.objects.select_related('event', 'submitted_by').all()
        else:
            # Users can only see reports for events they created or events in their clubs
            return EventReport.objects.filter(
                Q(event__created_by=user) |
                Q(event__club__admins=user) |
                Q(event__club__members=user)
            ).select_related('event', 'submitted_by').distinct()
    
    def perform_create(self, serializer):
        """Set the submitted_by field and validate event has ended."""
        event = serializer.validated_data['event']
        
        # Additional validation: ensure event has ended
        if not event.date or event.date >= timezone.now():
            raise serializers.ValidationError(
                "Reports can only be submitted for events that have ended."
            )
        
        serializer.save(submitted_by=self.request.user)
    
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
            Q(created_by=user) |
            Q(club__admins=user)
        ).select_related('club').distinct()
        
        # Use EventListSerializer to return basic event info
        serializer = EventListSerializer(
            ended_events, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='attendance-data')
    def get_attendance_data(self, request, pk=None):
        """Get attendance data for report generation."""
        report = self.get_object()
        event = report.event
        
        # Check permissions
        user = request.user
        if not (user.is_staff or user.is_superuser or 
                event.created_by == user or
                event.club.admins.filter(id=user.id).exists() or
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
            Q(club__members=user) | Q(club__admins=user)
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
