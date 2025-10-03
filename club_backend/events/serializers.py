from rest_framework import serializers
from .models import Event, EventRegistration, EventReport
from users.models import CustomUser
from clubs.models import Club

from django.utils import timezone

class EventSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    club_name = serializers.CharField(source='club.name', read_only=True)
    
    registration_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'club', 'club_name', 
            'tag', 'date', 'created_at', 'created_by', 
            'registration_count', 'poster'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
        
    def get_registration_count(self, obj):
        """Get the number of registrations for this event."""
        return obj.registrations.count()

    def validate_title(self, value):
        """Validate event title."""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        
        # Sanitize input - remove excessive whitespace
        value = ' '.join(value.split())
        
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters long.")
        
        return value

    def validate_description(self, value):
        """Validate and sanitize description."""
        if value:
            # Sanitize input
            value = ' '.join(value.split())
            
            if len(value) > 500:
                raise serializers.ValidationError("Description cannot exceed 500 characters.")
        
        return value

    def validate_date(self, value):
        """Validate event date."""
        if value and value < timezone.now():
            raise serializers.ValidationError("Event date cannot be in the past.")
        return value

    def validate_club(self, value):
        """Validate club access."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            
            # Check if user is a member of the club or has permission to create events
            if not (user.is_staff or user.is_superuser or 
                    value.members.filter(id=user.id).exists() #or
                    # value.admins.filter(id=user.id).exists()
                    ):
                raise serializers.ValidationError(
                    "You don't have permission to create events for this club."
                )
        
        return value

    def create(self, validated_data):
        """Override create to set the created_by field."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
    
class EventListSerializer(serializers.ModelSerializer):
    club_name = serializers.CharField(source='club.name', read_only=True)
    registration_count = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'club', 'club_name', 'tag', 'date', 
            'registration_count', 'is_registered', 'poster'
        ]
        
    def get_registration_count(self, obj):
        """Get the number of registrations for this event."""
        return obj.registrations.count()
    
    def get_is_registered(self, obj):
        """Check if current user is registered for this event."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.registrations.filter(user=request.user).exists()
        return False
    
class EventRegistrationSerializer(serializers.ModelSerializer):
    """
    Event registration serializer with security validations.
    """
    user_fullname = serializers.SerializerMethodField()
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model = EventRegistration
        fields = ['id', 'event', 'user', 'user_fullname', 'event_title', 
                 'created_at', 'attended']
        read_only_fields = ['id', 'created_at', 'user']

    def validate_event(self, value):
        """Validate event registration."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            
            # Check if user is already registered
            if EventRegistration.objects.filter(event=value, user=user).exists():
                raise serializers.ValidationError("You are already registered for this event.")
            
            # Check if event date has passed
            if value.date and value.date < timezone.now():
                raise serializers.ValidationError("Cannot register for past events.")
                
        return value

    def create(self, validated_data):
        """Override create to set the user field."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        return super().create(validated_data)
    
    def get_user_fullname(self, obj):
        fullname = obj.user.get_full_name()
        return fullname.strip() if fullname.strip() else obj.user.username
        


class EventReportSerializer(serializers.ModelSerializer):
    """
    Event report serializer with validation and auto-calculation features.
    """
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    actual_attendance = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = EventReport
        fields = [
            'id', 'event', 'event_title', 'submitted_by', 'submitted_by_username',
            'submitted_at', 'participants_attended', 'summary', 'actual_attendance'
        ]
        read_only_fields = ['id', 'submitted_at', 'submitted_by', 'participants_attended']

    def get_actual_attendance(self, obj):
        """Get the actual attendance count from registrations."""
        return obj.calculate_attendance()

    def validate_event(self, value):
        """Validate event for report creation."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            
            # Check if user has permission to submit report for this event
            if not (user.is_staff or user.is_superuser or 
                    value.created_by == user # or
                    # value.club.admins.filter(id=user.id).exists()
                    ):
                raise serializers.ValidationError(
                    "You don't have permission to submit a report for this event."
                )
            
            # Check if report already exists
            if hasattr(value, 'reports') and value.reports.exists():
                raise serializers.ValidationError("A report for this event already exists.")
                
            # Check if event has occurred
            if value.date and value.date > timezone.now():
                raise serializers.ValidationError("Cannot submit report for future events.")
        
        return value

    def validate_summary(self, value):
        """Validate and sanitize summary."""
        if not value or not value.strip():
            raise serializers.ValidationError("Summary cannot be empty.")
        
        # Sanitize input
        value = ' '.join(value.split())
        
        if len(value) < 10:
            raise serializers.ValidationError("Summary must be at least 10 characters long.")
        
        return value

    def create(self, validated_data):
        """Override create to set the submitted_by field."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['submitted_by'] = request.user
        return super().create(validated_data)


# Additional utility serializers

class EventDetailSerializer(EventSerializer):
    """
    Detailed event serializer with all related information.
    """
    registrations = EventRegistrationSerializer(many=True, read_only=True)
    reports = EventReportSerializer(read_only=True)
    
    class Meta(EventSerializer.Meta):
        fields = EventSerializer.Meta.fields + ['registrations', 'reports', 'description']


class EventRegistrationListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for registration lists.
    """
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = EventRegistration
        fields = ['id', 'user_username', 'user_email', 'created_at', 'attended']


class BulkAttendanceUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk attendance updates.
    """
    registrations = serializers.DictField(
        child=serializers.CharField(),
        required=True
    )
    
    def validate_registrations(self, value):
        """Validate bulk attendance data."""
        if not value:
            raise serializers.ValidationError("No registration data provided.")
        
        for reg_id, attended in value.items():
           
            
            try:
                int(reg_id)
            except ValueError:
                raise serializers.ValidationError(f"Registration ID {reg_id} must be a number.")
            
            if not isinstance(attended, str) or  attended.lower() not in ['true', 'false']:
                raise serializers.ValidationError("Attended must be true or false.")
        
        return value
    
