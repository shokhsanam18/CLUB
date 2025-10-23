from core.permissions import HybridPermission
from rest_framework import permissions

class UserProfilePermission(HybridPermission):
    """Profile permissions for users app"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_active
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            if obj.is_profile_public:
                return True
            
            if request.user == obj:
                return True
            
            return self.check_permission(
                request.user,
                'users',  # app_label
                'view_private_profiles',
                'view_private_profile',
                obj
            )
            
        if getattr(view, 'action', None) == 'assign_role':
            return (
                self.check_permission(
                    request.user,
                    'users',
                    'assign_volunteers',
                    'assign_volunteers',
                    obj
                )
                or
                self.check_permission(
                    request.user,
                    'users',
                    'assign_vice_ambassadors',
                    'assign_vice_ambassadors',
                    obj
                )
            )
        
        elif request.method in ['PATCH', 'PUT']:
            # Editing profiles
            if request.user == obj:
                return True
            
            return self.check_permission(
                request.user,
                'users',  # app_label
                'edit_any_profile',
                'edit_any_profile',
                obj
            )
        
        return False
    
    def validate_business_rules(self, user, action, target_object=None):
        """Business rules for user profiles"""
        role = self.get_user_role(user)
        
        if action == 'assign_volunteers':
            if role == 'superadmin':
                return True
            elif role in ['ambassador', 'vice-ambassador']:
                return target_object and user.university == target_object.university
            return False
        
         
        if action == 'assign_vice_ambassadors':
          if role == 'superadmin':
              return True
          elif role == 'ambassador':
              return target_object and user.university == target_object.university
          return False
      
        
        if action == 'view_private_profile':
            if role == 'superadmin':
                return True
            elif role in ['ambassador', 'vice-ambassador']:
                return target_object and user.university == target_object.university
            return False
        
        elif action == 'edit_any_profile':
            if role == 'superadmin':
                return True
            elif role in ['ambassador', 'vice-ambassador']:
                return target_object and user.university == target_object.university
            return False
        
        
        
        return True