from core.permissions import HybridPermission

class ClubPermission(HybridPermission):
    """Club permissions"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        action = getattr(view, 'action', None)
        
        if action in ['list', 'retrieve']:
            return True
        
        if action == 'create':
            return self.check_permission(
                request.user,
                'clubs',  # app_label
                'create_clubs',
                'create_club'
            )
        
        return True
    
    def has_object_permission(self, request, view, obj):
        action = getattr(view, 'action', None)
        
        if action == 'retrieve':
            return True
        
        if action in ['update', 'partial_update', 'destroy']:
            return self.check_permission(
                request.user,
                'clubs',  # app_label
                'manage_clubs',
                'manage_club',
                obj
            )
        
        return False
    
    def validate_business_rules(self, user, action, target_object=None):
        """Business rules for clubs"""
        role = self.get_user_role(user)
        
        if action in ['manage_club', 'create_club']:
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                if target_object:  # For manage_club
                    return user.university == target_object.university
                return True  # For create_club (university will be set to user's)
            return False
        
        return True