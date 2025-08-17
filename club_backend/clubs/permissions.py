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
    
class JoinRequestPermission(HybridPermission):
    """Join request permissions with hybrid approach"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return True
    
    def has_object_permission(self, request, view, obj):
        action = getattr(view, 'action', None)
        
        if action == 'retrieve':
            return self.check_permission(
                request.user,
                'view_join_requests',
                'view_join_requests',
                obj
            )
        
        elif action in ['approve', 'reject']:
            permission_name = f'{action}_join_requests'
            return self.check_permission(
                request.user,
                permission_name,
                f'{action}_join_request',
                obj
            )
        
        elif action in ['update', 'destroy']:
            # Users can cancel their own pending requests
            if obj.user == request.user and obj.status == 'pending':
                return True
            
            return self.check_permission(
                request.user,
                'manage_join_requests',
                'manage_join_requests',
                obj
            )
        
        return False
    
    def validate_business_rules(self, user, action, target_object=None):
        """Override to add join request specific rules"""
        role = self.get_user_role(user)
        
        if action == 'create_join_request':
            # Basic validation: authenticated users can create join requests
            if not user.is_authenticated:
                return False
            
            # Business rule: User must be from same university as club
            if hasattr(target_object, 'university') and hasattr(user, 'university'):
                if target_object.university != user.university:
                    return False
            
            # Business rule: User shouldn't already be in another club
            if hasattr(user, 'club') and user.club and user.club != target_object:
                return False
            
            return True
        
        if action == 'view_join_requests':
            # Users can view their own requests
            if target_object and target_object.user == user:
                return True
            
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                return target_object and user.university == target_object.club.university
            return False
        
        elif action in ['approve_join_request', 'reject_join_request']:
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                return target_object and user.university == target_object.club.university
            return False
        
        elif action == 'manage_join_requests':
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                return target_object and user.university == target_object.club.university
            return False
        
        # Fall back to parent class for other actions
        return super().validate_business_rules(user, action, target_object)
    
    