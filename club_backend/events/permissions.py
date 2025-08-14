from core.permissions import HybridPermission

class EventPermission(HybridPermission):
    """Event permissions"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        action = getattr(view, 'action', None)
        
        if action in ['list', 'retrieve']:
            return True
        
        if action == 'create':
            return self.check_permission(
                request.user,
                'events',  # app_label
                'create_events',
                'create_event'
            )
        
        return True
    
    def has_object_permission(self, request, view, obj):
        action = getattr(view, 'action', None)
        
        if action == 'retrieve':
            return True
        
        if action in ['update', 'partial_update', 'destroy']:
            return self.check_permission(
                request.user,
                'events',  # app_label
                'manage_events',
                'manage_event',
                obj
            )
        
        return False
    
    def validate_business_rules(self, user, action, target_object=None):
        """Business rules for events"""
        role = self.get_user_role(user)
        
        if action == 'create_event':
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                return True  # Can create in their university (checked elsewhere)
            elif role == 'volunteer':
                return user.club is not None
            return False
        
        elif action == 'manage_event':
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                return target_object and user.university == target_object.club.university
            elif role == 'volunteer':
                return (target_object and 
                       (user.club == target_object.club or target_object.created_by == user))
            return False
        
        return True