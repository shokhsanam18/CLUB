from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()

class PermissionError(Exception):
    """Custom exception for permission errors with detailed messages."""
    def __init__(self, error, detail, code, status_code=403, **extra_data):
        self.error = error
        self.detail = detail  
        self.code = code
        self.status_code = status_code
        self.extra_data = extra_data
        super().__init__(detail)
        


class HybridPermission(permissions.BasePermission):
    """
    Base hybrid permission system for all apps
    """
    
    def get_user_role(self, user):
        """Get user's primary role"""
        if not user or not user.is_authenticated or not user.is_active:
            return 'anonymous'
        
        user_groups = list(user.groups.values_list('name', flat=True))
        role_hierarchy = ['Superadmin', 'Ambassador', 'Volunteer', 'Member']
        
        for role in role_hierarchy:
            if role in user_groups:
                return role.lower()
        return 'registered'
    
    def has_django_permission(self, user, app_label, permission_codename):
        """Check if user has Django permission (any app)"""
        return user.has_perm(f'{app_label}.{permission_codename}')
    
    def validate_business_rules(self, user, action, target_object=None):
        """Override in specific permission classes"""
        return True
    
    def check_permission(self, user, app_label, django_permission, business_rule_action, target_object=None):
        """
        Combined check: Django permission + business rules
        """
        # Step 1: Check Django permission
        if not self.has_django_permission(user, app_label, django_permission):
            return False
        
        # Step 2: Check business rules
        return self.validate_business_rules(user, business_rule_action, target_object)