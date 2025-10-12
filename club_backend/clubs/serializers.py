from rest_framework import serializers
from django.core.files.images import get_image_dimensions
from django.core.validators import FileExtensionValidator
from django.db import transaction
from django.contrib.auth.models import Group

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
    
    member_count = serializers.IntegerField(source='member_count_annotated', read_only=True)
    level = serializers.SerializerMethodField()
    months_count = serializers.ReadOnlyField()
    active_events_count = serializers.IntegerField(source='active_events_count_annotated', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    
    club_points = serializers.IntegerField(read_only=True)
    total_events = serializers.IntegerField(source='total_events_annotated', read_only=True)
    
   
    
    
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
            'id', 'name', 'admin', 'university', 'description', 'logo',
            'club_points', 'total_events', 'created_at',
            'member_count', 'level', 'months_count', 'active_events_count'
        ]
        read_only_fields = ['id', 'created_at', 'club_points', 'total_events']
        
    def get_level(self, obj):
        # Use annotated field
        total_events = getattr(obj, 'total_events_annotated', 0)
        months = obj.months_count
        
        levels = ['Hut', 'House', 'Castle']
        if 10 <= total_events <= 25 and months >= 3:
            return f"Club-{levels[1]}"
        if total_events > 25 and months >= 6:
            return f"Club-{levels[2]}"
        return f"Club-{levels[0]}"
    

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
                    university__iexact=university,
                ).exclude(pk=self.instance.pk).exists():
                    raise serializers.ValidationError({
                        'name': 'A club with this name already exists at this university.'
                    })
        
        return attrs


class ClubListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for club listings.
    """
    member_count = serializers.IntegerField(source='member_count_annotated', read_only=True)
    level = serializers.SerializerMethodField()
    active_events_count = serializers.IntegerField(source='active_events_count_annotated', read_only=True)
    is_member = serializers.BooleanField(source='is_user_member', read_only=True)
    
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'university', 'logo', 'club_points',
            'member_count', 'level', 'active_events_count', 'is_member'
        ]

    # def get_is_member(self, obj):
    #     """Use prefetched members to avoid N+1 queries"""
    #     request = self.context.get('request')
    #     if request and hasattr(request, 'user') and request.user.is_authenticated:
    #         # Use prefetched data instead of filtering
    #         return any(member.id == request.user.id for member in obj.members.all())
    #     return False
    
    def get_level(self, obj):
        # Same as ClubSerializer.get_level above
        total_events = getattr(obj, 'total_events_annotated', 0)
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        now = timezone.now()
        delta = relativedelta(now, obj.created_at)
        months = delta.months + (delta.years * 12)
        
        levels = ['Hut', 'House', 'Castle']
        if 10 <= total_events <= 25 and months >= 3:
            return f"Club-{levels[1]}"
        if total_events > 25 and months >= 6:
            return f"Club-{levels[2]}"
        return f"Club-{levels[0]}"


class ClubDetailSerializer(ClubSerializer):
    """
    Detailed club serializer with additional information and nested data.
    """
    # Recent events (limit to prevent data exposure)
    recent_events = serializers.SerializerMethodField()
    
    # Admin information (limited for security)
    admins_count = serializers.SerializerMethodField()
    admin = serializers.SerializerMethodField()
    
    members = serializers.SerializerMethodField()
    
    class Meta(ClubSerializer.Meta):
        fields = ClubSerializer.Meta.fields + [
            'recent_events', 'admins_count', 'members', 'admin'
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
        
    def get_admin(self, obj):
        if obj.admin:
            return {
                "id" : obj.admin.id,
                "full_name": obj.admin.get_full_name(),
                "email": obj.admin.email,
                "tg_id" : obj.admin.tg_id
            }

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



        


class ClubStatsSerializer(serializers.ModelSerializer):
    """
    Serializer for club statistics and analytics.
    """
    total_members_count = serializers.IntegerField( read_only=True)
    total_events_count = serializers.IntegerField(read_only=True)  
    upcoming_events_count = serializers.IntegerField(read_only=True)
    past_events_count = serializers.IntegerField(read_only=True)
    level = serializers.ReadOnlyField()
    months_count = serializers.ReadOnlyField()
    active_events_count = serializers.ReadOnlyField()
    
    # Additional computed statistics
    events_per_month = serializers.SerializerMethodField()
    points_per_event = serializers.SerializerMethodField()
    
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'club_points', 'total_events', 'total_members_count',
            'level', 'months_count', 'active_events_count', 'upcoming_events', 'past_events',
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
                user.save(update_fields=["club"])

            # Ensure user is in Member group
            member_group, _ = Group.objects.get_or_create(name="Member")
            if not user.groups.filter(name="Member").exists():
                user.groups.add(member_group)

        elif action == 'leave':
            club.members.remove(user)
            if hasattr(user, 'club') and user.club == club:
                user.club = None
                user.save(update_fields=["club"])

            # Remove Member role if they aren’t in any club anymore
            if not Club.objects.filter(members=user).exists():
                member_group = Group.objects.filter(name="Member").first()
                if member_group and member_group in user.groups.all():
                    user.groups.remove(member_group)

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
    
class JoinRequestListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing join requests with user and processing details.
    """
    user = serializers.SerializerMethodField()
    processed_by = serializers.SerializerMethodField()
    
    class Meta:
        model = JoinRequest
        fields = [
            'id', 'user', 'status', 'created_at', 'processed_by'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_user(self, obj):
        """Get limited user information for privacy."""
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email,
            'tg_id' : obj.user.tg_id
        }
    
    def get_processed_by(self, obj):
        """Get information about who processed the request."""
        if hasattr(obj, 'processed_by') and obj.processed_by:
            return {
                'id': obj.processed_by.id,
                'username': obj.processed_by.username,
                'first_name': obj.processed_by.first_name,
                'last_name': obj.processed_by.last_name,
            }
        return None


class JoinRequestActionSerializer(serializers.Serializer):
    """
    Serializer for join request approve/reject actions.
    """
    message = serializers.CharField(required=False, max_length=500, help_text="Optional message for the user")
    
    def validate_message(self, value):
        """Sanitize message input."""
        if value:
            value = ' '.join(value.split())  # Remove extra whitespace
            if len(value) > 500:
                raise serializers.ValidationError("Message cannot exceed 500 characters.")
        return value


class JoinRequestActionResponseSerializer(serializers.Serializer):
    """
    Response serializer for join request approve/reject actions.
    """
    message = serializers.CharField()
    request_id = serializers.IntegerField()
    user = serializers.DictField()
    club = serializers.DictField()
    status = serializers.CharField()     
    
    reason = serializers.CharField(
        max_length=500, 
        required=False, 
        allow_blank=True,
        help_text="Optional reason for rejection"
    )