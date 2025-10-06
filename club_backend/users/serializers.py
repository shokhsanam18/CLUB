from rest_framework import serializers

from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.db import transaction

from .models import CustomUser
from clubs.models import Club
from clubs.serializers import ClubMembershipValidatorMixin

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'email', 'first_name', 'last_name', 
            'password', 'password_confirm', 'university', 
            'bio', 'tg_id'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'tg_id' : {'required' : True},
            'university': {'required': False},
        }
        
    def validate_tg_id(self, value):
        """Validate user's telegram id"""
        if not value.startswith("@"):
            raise serializers.ValidationError("Your telegram id should start with @ symbol")
        
        if CustomUser.objects.filter(tg_id=value).exists():
            raise serializers.ValidationError("A user with this telegram id already exists")
        
        return value
        
    def validate_email(self, value):
        """Validate that email is unique"""
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
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
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Password fields didn't match.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        
        # Auto-generate username from email
        email = validated_data['email']
        base_username = email.split('@')[0]
        
        # Ensure username uniqueness
        username = base_username
        counter = 1
        while CustomUser.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = CustomUser.objects.create_user(
            username=username,
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            university=validated_data.get('university', ''),
            bio=validated_data.get('bio', ''),
            tg_id=validated_data['tg_id'],
            is_active=True
        )
        
        registered_group = Group.objects.get(name='Registered')
        user.groups.add(registered_group)
        
        return user
    
class UserLoginSerializer(serializers.Serializer):
    username_or_email = serializers.CharField()
    password = serializers.CharField(write_only=True)
     
    def validate(self, attrs):
        username_or_email = attrs.get('username_or_email')
        password = attrs.get('password')
        if username_or_email and password:
                # Try to find user by username or email
                try:
                    if '@' in username_or_email:
                        user = CustomUser.objects.get(email=username_or_email)
                        username = user.username
                    else:
                        username = username_or_email
                except CustomUser.DoesNotExist:
                    raise serializers.ValidationError('Invalid credentials')

                # Authenticate user
                user = authenticate(username=username, password=password)

                if user:
                    if not user.is_active:
                        raise serializers.ValidationError('User account is disabled.')
                    attrs['user'] = user
                    return attrs
                else:
                    raise serializers.ValidationError('Invalid credentials')
        else:
            raise serializers.ValidationError('Must include username/email and password')
        
class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    all_roles = serializers.SerializerMethodField()
    club_name = serializers.CharField(source='club.name', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'university', 'bio',
                  'avatar', 'club', 'club_name', 'joined_club_at', 'is_profile_public', 
                  'role', 'all_roles', 'date_joined', 'tg_id']
        
        read_only_fields = [
            'id', 'username', 'date_joined', 'joined_club_at',
            'role', 'all_roles', 'club_name'
        ]
        
    def validate_email(self, value):
        """Validate email is unique (excluding current user)"""
        user = self.instance
        if user and CustomUser.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def get_role(self, obj):
        """Use prefetched groups"""
        role_hierarchy = ['Superadmin', 'Ambassador', 'Volunteer', 'Member']
        user_groups = [g.name for g in obj.groups.all()]  # Uses prefetch
        
        for role in role_hierarchy:
            if role in user_groups:
                return role
        return 'Registered'
    
    def get_all_roles(self, obj):
        return [g.name for g in obj.groups.all()]  # Uses prefetch
    
class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user info for admin/ambassador view"""
    role = serializers.CharField(read_only=True)
    all_roles = serializers.ListField(read_only=True)
    club_details = serializers.SerializerMethodField()
    events_attended_count = serializers.SerializerMethodField()
    events_organized_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'university', 'bio', 'avatar', 'club', 'club_details',
            'joined_club_at', 'is_profile_public', 'is_active',
            'role', 'all_roles', 'date_joined',
            'events_attended_count', 'events_organized_count', 'tg_id'
        ]
        read_only_fields = [
            'id', 'date_joined',
            'role', 'all_roles', 'events_attended_count', 'events_organized_count',
            'tg_id'
        ]
    
    def get_club_details(self, obj):
        """Get detailed club information"""
        if obj.club:
            return {
                'id': obj.club.id,
                'name': obj.club.name,
                'university': obj.club.university,
                'level': obj.club.level,
                'member_count': obj.club.member_count
            }
        return None
    
    def get_events_attended_count(self, obj):
        """Count of events user has attended"""
        return obj.registrations.filter(attended=True).count()
    
    def get_events_organized_count(self, obj):
        """Count of events user has organized"""
        return obj.events_created.count()



class ClubJoinSerializer(ClubMembershipValidatorMixin, serializers.Serializer):
    """
    Specialized serializer for joining clubs with your specific business logic.
    """
    club_id = serializers.IntegerField()
    
    def validate_club_id(self, value):
        """Validate club exists and user can join it."""
        club = self.validate_club_exists(value)
        user = self.context['request'].user
        
        # Your specific validations
        self.validate_university_match(user, club)
        
        return value
    
    def validate(self, attrs):
        """Cross-field validation with your business rules."""
        user = self.context['request'].user
        club_id = attrs['club_id']
        club = Club.objects.get(id=club_id)
        
        # Your specific business logic - one club per user
        if hasattr(user, 'club') and user.club:
            raise serializers.ValidationError(
                "You are already a member of a club. Leave your current club first."
            )
        
        # Additional validations
        self.validate_membership_status(user, club, 'join')
        self.validate_club_capacity(club)
        
        attrs['club'] = club
        return attrs
    
    @transaction.atomic
    def save(self):
        """Execute the join operation."""
        user = self.context['request'].user
        club = self.validated_data['club']
        
        # Your specific join logic
        club.members.add(user)
        
        # Update user's club reference if you have one-to-one relationship
        if hasattr(user, 'club'):
            user.club = club
            user.save()
        
        return {'club': club, 'user': user}


class ClubLeaveSerializer(ClubMembershipValidatorMixin, serializers.Serializer):
    """
    Serializer for leaving clubs - companion to ClubJoinSerializer.
    """
    # Optional: allow leaving by club_id or auto-detect current club
    club_id = serializers.IntegerField(required=False)
    
    def validate_club_id(self, value):
        """Validate club exists."""
        if value:
            return self.validate_club_exists(value).id
        return value
    
    def validate(self, attrs):
        """Validate user can leave the club."""
        user = self.context['request'].user
        club_id = attrs.get('club_id')
        
        # Auto-detect club if not provided
        if not club_id:
            if hasattr(user, 'club') and user.club:
                club = user.club
            else:
                raise serializers.ValidationError("You are not a member of any club.")
        else:
            club = Club.objects.get(id=club_id)
        
        self.validate_membership_status(user, club, 'leave')
        
        attrs['club'] = club
        return attrs
    
    @transaction.atomic
    def save(self):
        """Execute the leave operation."""
        user = self.context['request'].user
        club = self.validated_data['club']
        
        # Remove membership
        club.members.remove(user)
        
        # Clear user's club reference
        if hasattr(user, 'club'):
            user.club = None
            user.save()
        
        return {'club': club, 'user': user}


class UserRoleManagementSerializer(serializers.Serializer):
    """For admins to manage user roles"""
    user_id = serializers.IntegerField()
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            'Superadmin', 'Ambassador', 'Volunteer', 'Member'
        ])
    )
    
    def validate_user_id(self, value):
        """Validate user exists"""
        try:
            user = CustomUser.objects.get(id=value)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("User does not exist.")
        
        # Prevent self-role modification for security
        request_user = self.context['request'].user
        if user == request_user:
            raise serializers.ValidationError("You cannot modify your own roles.")
        
        return value
    
    def validate_roles(self, value):
        """Validate roles exist"""
        existing_groups = Group.objects.filter(name__in=value)
        if len(existing_groups) != len(value):
            raise serializers.ValidationError("One or more roles do not exist.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_current_password(self, value):
        """Validate current password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New password fields didn't match.")
        return attrs
    
    def save(self):
        """Update user password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate user with this email exists"""
        try:
            user = CustomUser.objects.get(email=value, is_active=True)
        except CustomUser.DoesNotExist:
            # Don't reveal if email exists or not for security
            pass
        return value


class UserSearchSerializer(serializers.ModelSerializer):
    """Minimal user info for search results"""
    role = serializers.CharField(read_only=True)
    club_name = serializers.CharField(source='club.name', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'university', 'role', 'club_name', 'avatar'
        ]
    
    def to_representation(self, instance):
        """Filter fields based on profile privacy"""
        data = super().to_representation(instance)
        
        # If profile is not public, limit information shown
        if not instance.is_profile_public:
            # Only show basic info for private profiles
            allowed_fields = ['id', 'username', 'first_name', 'university']
            data = {key: value for key, value in data.items() if key in allowed_fields}
        
        return data