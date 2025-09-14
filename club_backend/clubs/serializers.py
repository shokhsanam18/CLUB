from rest_framework import serializers
from django.core.files.images import get_image_dimensions
from django.core.validators import FileExtensionValidator
from django.db import transaction

from PIL import Image
from .models import Club, JoinRequest
from users.models import CustomUser

import logging

logger = logging.getLogger(__name__)

class ClubMembershipValidatorMixin:
    """
    Shared validation logic for club membership operations.
    This mixin contains common validation methods that can be reused.
    """
    
    def validate_club_exists(self, club_id):
        """Validate that club exists and return it."""
        try:
            return Club.objects.get(id=club_id)
        except Club.DoesNotExist:
            raise serializers.ValidationError("Club does not exist.")
    
    def validate_university_match(self, user, club):
        """Validate user can join clubs from their university."""
        if hasattr(user, 'university') and hasattr(club, 'university'):
            if club.university != user.university:
                raise serializers.ValidationError(
                    "You can only join clubs from your university."
                )
    
    def validate_membership_status(self, user, club, action):
        """Validate membership status based on action."""
        is_member = club.members.filter(id=user.id).exists()
        
        if action == 'join':
            if is_member:
                raise serializers.ValidationError("You are already a member of this club.")
                
            # Check if user is already in another club (based on your business logic)
            if hasattr(user, 'club') and user.club and user.club != club:
                raise serializers.ValidationError(
                    "You are already a member of another club. Leave your current club first."
                )
                
        elif action == 'leave':
            if not is_member:
                raise serializers.ValidationError("You are not a member of this club.")
    
    def validate_club_capacity(self, club):
        """Validate club has capacity for new members (if applicable)."""
        # Add capacity logic if needed
        max_members = getattr(club, 'max_members', None)
        if max_members and club.members.count() >= max_members:
            raise serializers.ValidationError("Club has reached maximum capacity.")

class ClubSerializer(serializers.ModelSerializer):
    """
    Main Club serializer with comprehensive validation and security features.
    """
    # Read-only computed fields
    member_count = serializers.ReadOnlyField()
    level = serializers.ReadOnlyField()
    months_count = serializers.ReadOnlyField()
    active_events_count = serializers.ReadOnlyField()
    created_at = serializers.DateTimeField(read_only=True)
    
    # Protected fields that should only be modified by specific operations
    club_points = serializers.IntegerField(read_only=True)
    total_events = serializers.IntegerField(read_only=True)
    
    # File field with custom validation
    logo = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'university', 'description', 'logo',
            'club_points', 'total_events', 'created_at',
            'member_count', 'level', 'months_count', 'active_events_count'
        ]
        read_only_fields = ['id', 'created_at', 'club_points', 'total_events']

    def validate_name(self, value):
        """Validate and sanitize club name."""
        if not value or not value.strip():
            raise serializers.ValidationError("Club name cannot be empty.")
        
        # Sanitize input - remove excessive whitespace
        value = ' '.join(value.split())
        
        # Length validation
        if len(value) < 3:
            raise serializers.ValidationError("Club name must be at least 3 characters long.")
        
        if len(value) > 100:
            raise serializers.ValidationError("Club name cannot exceed 100 characters.")
        
        # Check for inappropriate characters
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.&')
        if not set(value).issubset(allowed_chars):
            raise serializers.ValidationError("Club name contains invalid characters.")
        
        return value

    def validate_university(self, value):
        """Validate and sanitize university name."""
        if value:
            # Sanitize input
            value = ' '.join(value.split())
            
            if len(value) < 3:
                raise serializers.ValidationError("University name must be at least 3 characters long.")
            
            if len(value) > 200:
                raise serializers.ValidationError("University name cannot exceed 200 characters.")
            
            # Check for inappropriate characters
            allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.&,')
            if not set(value).issubset(allowed_chars):
                raise serializers.ValidationError("University name contains invalid characters.")
        
        return value

    def validate_description(self, value):
        """Validate and sanitize description."""
        if value:
            # Sanitize input
            value = ' '.join(value.split())
            
            if len(value) > 200:
                raise serializers.ValidationError("Description cannot exceed 200 characters.")
            
            # Basic profanity/spam check (you can expand this)
            forbidden_words = ['spam', 'scam']  # Add more as needed
            if any(word.lower() in value.lower() for word in forbidden_words):
                raise serializers.ValidationError("Description contains inappropriate content.")
        
        return value

    def validate_logo(self, value):
        """Validate logo image with security checks."""
        if value:
            # File size validation (2MB limit)
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError("Logo file size cannot exceed 2MB.")
            
            # Image dimensions validation
            try:
                width, height = get_image_dimensions(value)
                if width > 1024 or height > 1024:
                    raise serializers.ValidationError("Logo dimensions cannot exceed 1024x1024 pixels.")
                
                if width < 50 or height < 50:
                    raise serializers.ValidationError("Logo must be at least 50x50 pixels.")
                
                # Aspect ratio check (not too elongated)
                aspect_ratio = max(width, height) / min(width, height)
                if aspect_ratio > 3:
                    raise serializers.ValidationError("Logo aspect ratio is too extreme. Please use a more square image.")
                
            except Exception as e:
                raise serializers.ValidationError("Invalid image file.")
            
            # Additional security: Check if it's actually an image
            try:
                # Open with PIL to verify it's a valid image
                with Image.open(value) as img:
                    img.verify()
                # Reset file pointer after verify()
                value.seek(0)
            except Exception:
                raise serializers.ValidationError("File is not a valid image.")
        
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        name = attrs.get('name')
        university = attrs.get('university')
        
        # Check uniqueness for create operations
        if self.instance is None:  # Creating new club
            if name and university:
                if Club.objects.filter(name__iexact=name, university__iexact=university).exists():
                    raise serializers.ValidationError({
                        'name': 'A club with this name already exists at this university.'
                    })
        else:  # Updating existing club
            if name and university:
                # Exclude current instance from uniqueness check
                if Club.objects.filter(
                    name__iexact=name, 
                    university__iexact=university
                ).exclude(pk=self.instance.pk).exists():
                    raise serializers.ValidationError({
                        'name': 'A club with this name already exists at this university.'
                    })
        
        return attrs


class ClubListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for club listings.
    """
    member_count = serializers.ReadOnlyField()
    level = serializers.ReadOnlyField()
    active_events_count = serializers.ReadOnlyField()
    is_member = serializers.SerializerMethodField()
    
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'university', 'logo', 'club_points',
            'member_count', 'level', 'active_events_count', 'is_member'
        ]

    def get_is_member(self, obj):
        """Check if current user is a member of this club."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.members.filter(id=request.user.id).exists()
        return False


class ClubDetailSerializer(ClubSerializer):
    """
    Detailed club serializer with additional information and nested data.
    """
    # Recent events (limit to prevent data exposure)
    recent_events = serializers.SerializerMethodField()
    
    # Admin information (limited for security)
    admins_count = serializers.SerializerMethodField()
    
    members = serializers.SerializerMethodField()
    
    class Meta(ClubSerializer.Meta):
        fields = ClubSerializer.Meta.fields + [
            'recent_events', 'admins_count', 'members'
        ]

    def get_recent_events(self, obj):
        """Get limited recent events information."""
        try:
            from events.serializers import EventListSerializer  # Avoid circular import
            if not hasattr(obj, 'events'):
                return []
            recent_events = obj.events.order_by('-created_at')[:5]
            return EventListSerializer(
                recent_events, 
                many=True, 
                context=self.context
            ).data
        except Exception as e:
            logger.error(f"Error occured: {str(e)}")

    def get_admins_count(self, obj):
        """Get count of admins (not exposing actual admin list for security)."""
        return obj.admins.count() if hasattr(obj, 'admins') else 0
    
    def get_members(self, obj):
        """Get club members with limited information for privacy."""
        try:
            if not hasattr(obj, 'members'):
                return []
            
            members = obj.members.filter(is_active=True)
            return [
                {
                    'id': member.id,
                    'username': member.username,
                    'first_name': member.first_name,
                    'last_name': member.last_name,
                    'role': member.role
                }
                for member in members
            ]
        except Exception as e:
            logger.error(f"Error getting club members: {str(e)}")
            return []

class ClubCreateSerializer(ClubSerializer):
    """
    Specialized serializer for club creation with stricter validation.
    """
    
    class Meta:
        model = Club
        fields = ['name', 'university', 'description', 'logo']

    def validate_name(self, value):
        """Enhanced validation for new clubs."""
        # Call parent's validate_name method
        value = super().validate_name(value)
        
        # Additional checks for new clubs
        reserved_names = ['admin', 'system', 'api', 'test', 'demo']
        if value.lower() in reserved_names:
            raise serializers.ValidationError("This club name is reserved.")
        
        return value

    def validate(self, attrs):
        """Enhanced validation for club creation."""
        attrs = super().validate(attrs)
        
        # Require university for new clubs
        if not attrs.get('university'):
            raise serializers.ValidationError({
                'university': 'University is required for new clubs.'
            })
        
        return attrs

    def create(self, validated_data):
        """Override create to add additional setup."""
        club = super().create(validated_data)
        
        # Add creator as admin if available from context
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            # Assuming you have a method to add admin
            # club.admins.add(request.user)
            pass
        
        return club


class ClubUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for club updates with permission-aware field restrictions.
    """
    logo = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])
        ]
    )
    
    class Meta:
        model = Club
        fields = ['name', 'university', 'description', 'logo']

    def validate(self, attrs):
        """Permission-aware validation."""
        request = self.context.get('request')
        
        if request and hasattr(request, 'user'):
            user = request.user
            club = self.instance
            
            # Check if user has permission to update this club
            if not (user.is_staff or user.is_superuser or 
                    club.admins.filter(id=user.id).exists()):
                raise serializers.ValidationError("You don't have permission to update this club.")
            
            # Restrict certain fields for non-superusers
            if not user.is_superuser:
                if 'university' in attrs and attrs['university'] != club.university:
                    raise serializers.ValidationError({
                        'university': 'Only superusers can change university affiliation.'
                    })
        
        return ClubSerializer().validate(self, attrs)


class ClubStatsSerializer(serializers.ModelSerializer):
    """
    Serializer for club statistics and analytics.
    """
    member_count = serializers.ReadOnlyField()
    level = serializers.ReadOnlyField()
    months_count = serializers.ReadOnlyField()
    active_events_count = serializers.ReadOnlyField()
    
    # Additional computed statistics
    events_per_month = serializers.SerializerMethodField()
    points_per_event = serializers.SerializerMethodField()
    
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'club_points', 'total_events', 'member_count',
            'level', 'months_count', 'active_events_count',
            'events_per_month', 'points_per_event'
        ]

    def get_events_per_month(self, obj):
        """Calculate average events per month."""
        if obj.months_count > 0:
            return round(obj.total_events / obj.months_count, 2)
        return 0

    def get_points_per_event(self, obj):
        """Calculate average points per event."""
        if obj.total_events > 0:
            return round(obj.club_points / obj.total_events, 2)
        return 0


class ClubMembershipSerializer(ClubMembershipValidatorMixin, serializers.Serializer):
    """
    Generic serializer for both join/leave operations.
    This works alongside your specific serializers for different use cases.
    """
    action = serializers.ChoiceField(choices=['join', 'leave'])
    club_id = serializers.IntegerField(required=False)  # Required for join, optional for leave
    
    def validate(self, attrs):
        """Route to appropriate validation based on action."""
        action = attrs['action']
        club_id = attrs.get('club_id')
        user = self.context['request'].user
        
        if action == 'join':
            if not club_id:
                raise serializers.ValidationError("club_id is required for join action.")
            
            club = self.validate_club_exists(club_id)
            self.validate_university_match(user, club)
            self.validate_membership_status(user, club, 'join')
            self.validate_club_capacity(club)
            
            # Your specific business rule
            if hasattr(user, 'club') and user.club:
                raise serializers.ValidationError(
                    "You are already a member of a club. Leave your current club first."
                )
            
        elif action == 'leave':
            # Auto-detect club if not provided
            if not club_id:
                if hasattr(user, 'club') and user.club:
                    club = user.club
                    club_id = club.id
                else:
                    raise serializers.ValidationError("You are not a member of any club.")
            else:
                club = self.validate_club_exists(club_id)
            
            self.validate_membership_status(user, club, 'leave')
        
        attrs['club_id'] = club_id
        return attrs
    
    @transaction.atomic
    def save(self):
        """Execute the membership operation."""
        action = self.validated_data['action']
        club_id = self.validated_data['club_id']
        user = self.context['request'].user
        club = Club.objects.get(id=club_id)
        
        if action == 'join':
            club.members.add(user)
            if hasattr(user, 'club'):
                user.club = club
                user.save()
        elif action == 'leave':
            club.members.remove(user)
            if hasattr(user, 'club'):
                user.club = None
                user.save()
        
        return {
            'action': action,
            'club': club,
            'user': user,
            'message': f'Successfully {action}ed {"" if action == "leave" else "club"}'
        }


class BulkClubActionSerializer(serializers.Serializer):
    """
    Serializer for bulk operations on clubs (admin use).
    """
    club_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=50  # Prevent abuse
    )
    action = serializers.ChoiceField(choices=['activate', 'deactivate', 'archive'])
    
    def validate_club_ids(self, value):
        """Validate that all club IDs exist and user has permission."""
        request = self.context.get('request')
        
        if not request or not request.user.is_staff:
            raise serializers.ValidationError("Staff permission required for bulk operations.")
        
        # Check that all clubs exist
        existing_clubs = Club.objects.filter(id__in=value).count()
        if existing_clubs != len(value):
            raise serializers.ValidationError("Some club IDs do not exist.")
        
        return value
    
class JoinRequestCreateSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = JoinRequest
        fields = ['club']
        
    def create(self, validated_data):
        request = self.context['request']
        jr = JoinRequest.objects.create(
            user=request.user,
            club=validated_data['club']
        )
        
        return jr        