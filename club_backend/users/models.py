from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from clubs.models import Club


class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        # Create the superuser normally
        user = super().create_superuser(username, email, password, **extra_fields)
        
        # Add to Superadmin group if it exists
        try:
            from django.contrib.auth.models import Group
            superadmin_group = Group.objects.get(name='Superadmin')
            user.groups.add(superadmin_group)
        except Group.DoesNotExist:
            user.is_staff = True
            user.is_superuser = True
        
        return user
    
# Create your models here.
class CustomUser(AbstractUser):
    university = models.CharField(max_length=200, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to="media/avatars", blank=True, null=True)
    
    club = models.ForeignKey(
        Club,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members"
    )
    
    joined_club_at = models.DateTimeField(null=True, blank=True)
    
    is_profile_public = models.BooleanField(default=True)
    
    objects = CustomUserManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['university']),
            models.Index(fields=['club']),
        ]
        
        # These permissions will appear in Django admin
        permissions = [
            ("view_all_profiles", "Can view all user profiles"),
            ("view_private_profiles", "Can view private profiles"),
            ("edit_any_profile", "Can edit any user profile"),
            ("assign_volunteers", "Can assign volunteer role"),
            ("assign_ambassadors", "Can assign ambassador role"),
            ("export_data", "Can export platform data"),
            ("view_join_requests", "Can view join requests"),
            ("approve_join_requests", "Can approve join requests"),
            ("reject_join_requests", "Can reject join requests"),
            ("manage_join_requests", "Can manage join requests"),
            ("resubmit_join_request", "Can resubmit join request"),
        ]
        
    def __str__(self):
        return f"{self.get_full_name() or self.username} - {self.university}"
    
    @property
    def role(self):
        """Get user's primary role"""
        user_groups = self.groups.values_list('name', flat=True)
        role_hierarchy = ['Superadmin', 'Ambassador', 'Volunteer', 'Member']
        
        for role in role_hierarchy:
            if role in user_groups:
                return role # Clean display
        return 'Registered'
    
    @property
    def all_roles(self):
        """Get all user roles"""
        return list(self.groups.values_list('name', flat=True))
    
    def has_admin_access(self):
        """Check if user can access admin panel"""
        admin_roles = ['Superadmin', 'Ambassador']
        return any(role in self.all_roles for role in admin_roles)
    
    def is_superadmin(self):
        """Check if user is a superadmin"""
        return 'Superadmin' in self.all_roles
    
    def is_ambassador(self):
        """Check if user is an ambassador"""
        return 'Ambassador' in self.all_roles
    
    def is_volunteer(self):
        """Check if user is a volunteer (event organizer)"""
        return 'Volunteer' in self.all_roles
    
    def is_member(self):
        """Check if user is a regular member"""
        return 'Member' in self.all_roles
    
    def save(self, *args, **kwargs):
        """Sync is_staff and is_superuser with group memberships on save"""
        super().save(*args, **kwargs)
        
        # Update the actual fields based on groups
        has_admin = self.has_admin_access()
        is_super = self.is_superadmin()
        
        if self.is_staff != has_admin or self.is_superuser != is_super:
            # Use update to avoid recursion
            CustomUser.objects.filter(pk=self.pk).update(
                is_staff=has_admin,
                is_superuser=is_super
            )