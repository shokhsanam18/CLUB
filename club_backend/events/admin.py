from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.admin import SimpleListFilter
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.core.exceptions import PermissionDenied

from .models import Event, EventRegistration, EventReport


class EventFilter(SimpleListFilter):
    """Custom filter for events based on user permissions."""
    title = 'Event'
    parameter_name = 'event'

    def lookups(self, request, model_admin):
        """Return events user can access based on their role."""
        user = request.user
        
        if user.is_superuser:
            events = Event.objects.all()
        elif hasattr(user, 'role') and user.role == 'ambassador':
            # Ambassador can see events from their university
            events = Event.objects.filter(club__university=user.university)
        elif hasattr(user, 'role') and user.role == 'volunteer':
            # Volunteer can see events from their club or events they created
            events = Event.objects.filter(
                Q(club=user.club) | Q(created_by=user)
            ).distinct()
        else:
            events = Event.objects.filter(created_by=user)
        
        return [(event.id, f"{event.title} ({event.club.name})") 
                for event in events.order_by('-created_at')[:50]]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(event_id=self.value())
        return queryset


class AttendanceFilter(SimpleListFilter):
    """Filter registrations by attendance status."""
    title = 'Attendance Status'
    parameter_name = 'attendance'

    def lookups(self, request, model_admin):
        return (
            ('attended', 'Attended'),
            ('not_attended', 'Not Attended'),
            ('pending', 'Pending (Event Not Ended)'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'attended':
            return queryset.filter(attended=True)
        elif self.value() == 'not_attended':
            return queryset.filter(attended=False, event__date__lt=timezone.now())
        elif self.value() == 'pending':
            return queryset.filter(event__date__gte=timezone.now())
        return queryset


class EventStatusFilter(SimpleListFilter):
    """Filter events by their status (upcoming/ongoing/past)."""
    title = 'Event Status'
    parameter_name = 'event_status'

    def lookups(self, request, model_admin):
        return (
            ('upcoming', 'Upcoming'),
            ('past', 'Past'),
            ('today', 'Today'),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        if self.value() == 'upcoming':
            return queryset.filter(event__date__gt=now)
        elif self.value() == 'past':
            return queryset.filter(event__date__lt=today_start)
        elif self.value() == 'today':
            return queryset.filter(event__date__range=(today_start, today_end))
        return queryset


@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = [
        'get_event_title', 
        'get_user_display', 
        'get_club_name',
        'created_at', 
        'attended_status',
        'get_event_date',
        'get_registration_actions'
    ]
    
    list_filter = [
        EventFilter,
        AttendanceFilter, 
        EventStatusFilter,
        'created_at',
        'event__tag',
    ]
    
    search_fields = [
        'user__username', 
        'user__email', 
        'user__first_name', 
        'user__last_name',
        'event__title', 
        'event__club__name'
    ]
    
    readonly_fields = [
        'created_at', 
        'get_event_details',
        'get_user_details'
    ]
    
    list_select_related = ['event', 'user', 'event__club']
    list_per_page = 25
    
    # Custom field methods
    def get_event_title(self, obj):
        """Display event title with link."""
        url = reverse('admin:events_event_change', args=[obj.event.id])
        return format_html('<a href="{}">{}</a>', url, obj.event.title)
    get_event_title.short_description = 'Event'
    get_event_title.admin_order_field = 'event__title'
    
    def get_user_display(self, obj):
        """Display user with email."""
        return f"{obj.user.username} ({obj.user.email})"
    get_user_display.short_description = 'Participant'
    get_user_display.admin_order_field = 'user__username'
    
    def get_club_name(self, obj):
        """Display club name."""
        return obj.event.club.name
    get_club_name.short_description = 'Club'
    get_club_name.admin_order_field = 'event__club__name'
    
    def attended_status(self, obj):
        """Display attendance status with color coding."""
        if obj.event.date and obj.event.date > timezone.now():
            return format_html('<span style="color: orange;">⏳ Pending</span>')
        elif obj.attended:
            return format_html('<span style="color: green;">✅ Attended</span>')
        else:
            return format_html('<span style="color: red;">❌ Not Attended</span>')
    attended_status.short_description = 'Attendance'
    
    def get_event_date(self, obj):
        """Display formatted event date."""
        if obj.event.date:
            return obj.event.date.strftime('%Y-%m-%d %H:%M')
        return 'Not Set'
    get_event_date.short_description = 'Event Date'
    get_event_date.admin_order_field = 'event__date'
    
    def get_registration_actions(self, obj):
        """Display action buttons."""
        actions = []
        
        if obj.event.date and obj.event.date <= timezone.now():
            if obj.attended:
                actions.append('<span style="color: green;">✅</span>')
            else:
                actions.append('<span style="color: red;">❌</span>')
        else:
            actions.append('<span style="color: orange;">⏳</span>')
        
        return format_html(' '.join(actions))
    get_registration_actions.short_description = 'Actions'
    
    def get_event_details(self, obj):
        """Display detailed event information."""
        return format_html(
            '<strong>Event:</strong> {}<br>'
            '<strong>Club:</strong> {}<br>'
            '<strong>Date:</strong> {}<br>'
            '<strong>Tag:</strong> {}<br>'
            '<strong>Created by:</strong> {}',
            obj.event.title,
            obj.event.club.name,
            obj.event.date.strftime('%Y-%m-%d %H:%M') if obj.event.date else 'Not Set',
            obj.event.get_tag_display(),
            obj.event.created_by.username
        )
    get_event_details.short_description = 'Event Details'
    
    def get_user_details(self, obj):
        """Display detailed user information."""
        return format_html(
            '<strong>Username:</strong> {}<br>'
            '<strong>Email:</strong> {}<br>'
            '<strong>Name:</strong> {} {}<br>'
            '<strong>Registered:</strong> {}',
            obj.user.username,
            obj.user.email,
            obj.user.first_name,
            obj.user.last_name,
            obj.created_at.strftime('%Y-%m-%d %H:%M')
        )
    get_user_details.short_description = 'Participant Details'
    
    # Permission and queryset methods
    def get_queryset(self, request):
        """Filter queryset based on user permissions."""
        qs = super().get_queryset(request)
        user = request.user
        
        if user.is_superuser:
            return qs
        elif hasattr(user, 'role') and user.role == 'ambassador':
            # Ambassador can see registrations from their university
            return qs.filter(event__club__university=user.university)
        elif hasattr(user, 'role') and user.role == 'volunteer':
            # Volunteer can see registrations for events from their club or events they created
            return qs.filter(
                Q(event__club=user.club) | Q(event__created_by=user)
            ).distinct()
        else:
            # Regular users can only see registrations for events they created
            return qs.filter(event__created_by=user)
    
    def has_change_permission(self, request, obj=None):
        """Check if user can change registration."""
        if not super().has_change_permission(request, obj):
            return False
        
        if obj is None:
            return True
        
        user = request.user
        if user.is_superuser:
            return True
        elif hasattr(user, 'role') and user.role == 'ambassador':
            return obj.event.club.university == user.university
        elif hasattr(user, 'role') and user.role == 'volunteer':
            return obj.event.club == user.club or obj.event.created_by == user
        else:
            return obj.event.created_by == user
    
    def has_delete_permission(self, request, obj=None):
        """Check if user can delete registration."""
        return self.has_change_permission(request, obj)
    
    # Custom actions
    actions = ['mark_as_attended', 'mark_as_not_attended', 'export_registrations']
    
    def mark_as_attended(self, request, queryset):
        """Mark selected registrations as attended."""
        count = 0
        for registration in queryset:
            if registration.event.date and registration.event.date <= timezone.now():
                registration.attended = True
                registration.save()
                count += 1
        
        self.message_user(
            request, 
            f'{count} registrations marked as attended.', 
            messages.SUCCESS
        )
    mark_as_attended.short_description = "Mark selected as attended"
    
    def mark_as_not_attended(self, request, queryset):
        """Mark selected registrations as not attended."""
        count = 0
        for registration in queryset:
            if registration.event.date and registration.event.date <= timezone.now():
                registration.attended = False
                registration.save()
                count += 1
        
        self.message_user(
            request, 
            f'{count} registrations marked as not attended.', 
            messages.SUCCESS
        )
    mark_as_not_attended.short_description = "Mark selected as not attended"


class ReportStatusFilter(SimpleListFilter):
    """Filter reports by review status."""
    title = 'Report Status'
    parameter_name = 'report_status'

    def lookups(self, request, model_admin):
        return (
            ('needs_review', 'Needs Review'),
            ('recent', 'Submitted Recently'),
            ('old', 'Older Reports'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'needs_review':
            # Reports submitted in last 7 days (assuming they need review)
            week_ago = timezone.now() - timezone.timedelta(days=7)
            return queryset.filter(submitted_at__gte=week_ago)
        elif self.value() == 'recent':
            week_ago = timezone.now() - timezone.timedelta(days=7)
            return queryset.filter(submitted_at__gte=week_ago)
        elif self.value() == 'old':
            week_ago = timezone.now() - timezone.timedelta(days=7)
            return queryset.filter(submitted_at__lt=week_ago)
        return queryset


@admin.register(EventReport)
class EventReportAdmin(admin.ModelAdmin):
    list_display = [
        'get_event_title',
        'get_submitted_by',
        'get_club_name',
        'submitted_at',
        'participants_attended',
        'get_actual_attendance',
        'get_attendance_difference',
        'get_report_actions'
    ]
    
    list_filter = [
        EventFilter,
        ReportStatusFilter,
        'submitted_at',
        'event__tag',
    ]
    
    search_fields = [
        'event__title',
        'event__club__name',
        'submitted_by__username',
        'summary',
    ]
    
    readonly_fields = [
        'submitted_at',
        'get_event_details',
        'get_attendance_analysis',
        'get_registration_breakdown'
    ]
    
    list_select_related = ['event', 'submitted_by', 'event__club']
    list_per_page = 20
    
    fieldsets = (
        ('Report Information', {
            'fields': ('event', 'submitted_by', 'submitted_at')
        }),
        ('Attendance Data', {
            'fields': ('participants_attended', 'get_attendance_analysis'),
            'description': 'Attendance information and analysis'
        }),
        ('Report Content', {
            'fields': ('summary',),
        }),
        ('Additional Details', {
            'fields': ('get_event_details', 'get_registration_breakdown'),
            'classes': ('collapse',)
        })
    )
    
    # Custom field methods
    def get_event_title(self, obj):
        """Display event title with link."""
        url = reverse('admin:events_event_change', args=[obj.event.id])
        return format_html('<a href="{}">{}</a>', url, obj.event.title)
    get_event_title.short_description = 'Event'
    get_event_title.admin_order_field = 'event__title'
    
    def get_submitted_by(self, obj):
        """Display submitter information."""
        return f"{obj.submitted_by.username} ({obj.submitted_by.email})"
    get_submitted_by.short_description = 'Submitted By'
    get_submitted_by.admin_order_field = 'submitted_by__username'
    
    def get_club_name(self, obj):
        """Display club name."""
        return obj.event.club.name
    get_club_name.short_description = 'Club'
    get_club_name.admin_order_field = 'event__club__name'
    
    def get_actual_attendance(self, obj):
        """Display calculated attendance from registrations."""
        actual = obj.calculate_attendance()
        return actual
    get_actual_attendance.short_description = 'Actual Attendance'
    
    def get_attendance_difference(self, obj):
        """Show difference between reported and actual attendance."""
        actual = obj.calculate_attendance()
        reported = obj.participants_attended
        difference = reported - actual
        
        if difference == 0:
            return format_html('<span style="color: green;">✅ Match</span>')
        elif difference > 0:
            return format_html('<span style="color: orange;">⚠️ +{}</span>', difference)
        else:
            return format_html('<span style="color: red;">❌ {}</span>', difference)
    get_attendance_difference.short_description = 'Difference'
    
    def get_report_actions(self, obj):
        """Display action buttons for reports."""
        actions = []
        
        # Time since submission
        time_diff = timezone.now() - obj.submitted_at
        if time_diff.days < 1:
            actions.append('<span style="color: orange;">🕐 New</span>')
        elif time_diff.days < 7:
            actions.append('<span style="color: blue;">📋 Recent</span>')
        else:
            actions.append('<span style="color: gray;">📜 Old</span>')
        
        return format_html(' '.join(actions))
    get_report_actions.short_description = 'Status'
    
    def get_event_details(self, obj):
        """Display comprehensive event information."""
        total_registrations = obj.event.registrations.count()
        actual_attendance = obj.calculate_attendance()
        
        return format_html(
            '<strong>Event:</strong> {}<br>'
            '<strong>Club:</strong> {}<br>'
            '<strong>Date:</strong> {}<br>'
            '<strong>Tag:</strong> {}<br>'
            '<strong>Created by:</strong> {}<br>'
            '<strong>Total Registrations:</strong> {}<br>'
            '<strong>Actual Attendance:</strong> {}',
            obj.event.title,
            obj.event.club.name,
            obj.event.date.strftime('%Y-%m-%d %H:%M') if obj.event.date else 'Not Set',
            obj.event.get_tag_display(),
            obj.event.created_by.username,
            total_registrations,
            actual_attendance
        )
    get_event_details.short_description = 'Event Details'
    
    def get_attendance_analysis(self, obj):
        """Display detailed attendance analysis."""
        total_registrations = obj.event.registrations.count()
        actual_attendance = obj.calculate_attendance()
        reported_attendance = obj.participants_attended
        
        attendance_rate = (actual_attendance / total_registrations * 100) if total_registrations > 0 else 0
        difference = reported_attendance - actual_attendance
        
        color = 'green' if difference == 0 else ('orange' if abs(difference) <= 2 else 'red')
        
        return format_html(
            '<strong>Total Registrations:</strong> {}<br>'
            '<strong>Reported Attendance:</strong> {}<br>'
            '<strong>Actual Attendance:</strong> {}<br>'
            '<strong>Attendance Rate:</strong> {:.1f}%<br>'
            '<strong>Difference:</strong> <span style="color: {};">{:+d}</span>',
            total_registrations,
            reported_attendance,
            actual_attendance,
            attendance_rate,
            color,
            difference
        )
    get_attendance_analysis.short_description = 'Attendance Analysis'
    
    def get_registration_breakdown(self, obj):
        """Display registration breakdown by attendance."""
        registrations = obj.event.registrations.all()
        attended = registrations.filter(attended=True).count()
        not_attended = registrations.filter(attended=False).count()
        
        return format_html(
            '<strong>Attended:</strong> {} participants<br>'
            '<strong>Did not attend:</strong> {} participants<br>'
            '<strong>Total registered:</strong> {} participants',
            attended,
            not_attended,
            attended + not_attended
        )
    get_registration_breakdown.short_description = 'Registration Breakdown'
    
    # Permission and queryset methods
    def get_queryset(self, request):
        """Filter queryset based on user permissions."""
        qs = super().get_queryset(request)
        user = request.user
        
        if user.is_superuser:
            return qs
        elif hasattr(user, 'role') and user.role == 'ambassador':
            # Ambassador can review reports from their university
            return qs.filter(event__club__university=user.university)
        elif hasattr(user, 'role') and user.role == 'volunteer':
            # Volunteer can see reports for events from their club or events they created
            return qs.filter(
                Q(event__club=user.club) | Q(event__created_by=user) | Q(submitted_by=user)
            ).distinct()
        else:
            # Regular users can only see reports they submitted
            return qs.filter(submitted_by=user)
    
    def has_change_permission(self, request, obj=None):
        """Check if user can change report."""
        if not super().has_change_permission(request, obj):
            return False
        
        if obj is None:
            return True
        
        user = request.user
        if user.is_superuser:
            return True
        elif hasattr(user, 'role') and user.role == 'ambassador':
            # Ambassador can edit reports from their university
            return obj.event.club.university == user.university
        elif hasattr(user, 'role') and user.role == 'volunteer':
            # Volunteer can edit their own reports or reports from their club events
            return (obj.submitted_by == user or 
                    obj.event.club == user.club or 
                    obj.event.created_by == user)
        else:
            # Regular users can only edit their own reports
            return obj.submitted_by == user
    
    def has_delete_permission(self, request, obj=None):
        """Check if user can delete report."""
        # More restrictive than change permission
        if obj is None:
            return True
        
        user = request.user
        if user.is_superuser:
            return True
        elif hasattr(user, 'role') and user.role == 'ambassador':
            return obj.event.club.university == user.university
        else:
            return obj.submitted_by == user
    
    # Custom actions
    actions = ['review_reports', 'export_reports']
    
    def review_reports(self, request, queryset):
        """Mark reports as reviewed (custom action)."""
        # This is a placeholder - you can implement actual review logic
        count = queryset.count()
        self.message_user(
            request,
            f'{count} reports marked for review.',
            messages.SUCCESS
        )
    review_reports.short_description = "Mark selected reports for review"


# Optional: Register Event model with enhanced admin
@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'club', 'tag', 'date', 'created_by', 'get_registration_count']
    list_filter = ['tag', 'club', 'created_at', 'date']
    search_fields = ['title', 'description', 'club__name']
    
    def get_registration_count(self, obj):
        return obj.registrations.count()
    get_registration_count.short_description = 'Registrations'
    
    def get_queryset(self, request):
        """Filter events based on user permissions."""
        qs = super().get_queryset(request)
        user = request.user
        
        if user.is_superuser:
            return qs
        elif hasattr(user, 'role') and user.role == 'ambassador':
            return qs.filter(club__university=user.university)
        elif hasattr(user, 'role') and user.role == 'volunteer':
            return qs.filter(Q(club=user.club) | Q(created_by=user)).distinct()
        else:
            return qs.filter(created_by=user)