from core.permissions import HybridPermission
import logging 
logger = logging.getLogger(__name__)

class ClubPermission(HybridPermission):
    """Club permissions"""
    
    def has_permission(self, request, view):
        logger.info(f"=== has_permission called ===")
        logger.info(f"User: {request.user}")
        logger.info(f"Is authenticated: {request.user.is_authenticated}")
        logger.info(f"Request method: {request.method}")
        
        if not request.user.is_authenticated:
            logger.warning(f"User not authenticated: {request.user}")
            return False
        
        action = getattr(view, 'action', None)
        logger.info(f"View action: {action}")
        
        if action in ['list', 'retrieve']:
            logger.info(f"Action '{action}' allowed - returning True")
            return True
        
        if action == 'create':
            logger.info(f"Action 'create' - checking permissions...")
            try:
                result = self.check_permission(
                    request.user,
                    'clubs',  # app_label
                    'create_clubs',
                    'create_club'
                )
                logger.info(f"create permission check result: {result}")
                return result
            except Exception as e:
                logger.error(f"Error in check_permission for create: {e}")
                raise
        
        logger.info(f"Default case - returning True for action: {action}")
        return True
    
    def has_object_permission(self, request, view, obj):
        logger.info(f"=== has_object_permission called ===")
        logger.info(f"User: {request.user}")
        logger.info(f"Object: {obj}")
        logger.info(f"Object type: {type(obj)}")
        
        # Log user role
        try:
            user_role = self.get_user_role(request.user)
            logger.info(f"User role: {user_role}")
        except Exception as e:
            logger.error(f"Error getting user role in has_object_permission: {e}")
            # Continue execution even if role fetch fails
        
        action = getattr(view, 'action', None)
        logger.info(f"View action: {action}")
        
        if action in ['retrieve', 'stats']:
            logger.info(f"Action '{action}' allowed - returning True")
            return True
        
        if action in ['join', 'join_requests', 'approve_join_request', 'reject_join_request']:
            # Allow join requests - permission is handled by JoinRequestPermission
            logger.info(f"Action {action} allowed - returning True")
            return True
        
        if action in ['update', 'partial_update', 'destroy']:
            logger.info(f"Action '{action}' - checking permissions...")
            try:
                result = self.check_permission(
                    request.user,
                    'clubs',  # app_label
                    'manage_clubs',
                    'manage_club',
                    obj
                )
                logger.info(f"manage permission check result: {result}")
                return result
            except Exception as e:
                logger.error(f"Error in check_permission for {action}: {e}")
                raise
        
        logger.warning(f"No matching action - returning False for action: {action}")
        return False
    
    def validate_business_rules(self, user, action, target_object=None):
        """Business rules for clubs"""
        logger.info(f"=== validate_business_rules called ===")
        logger.info(f"User: {user}")
        logger.info(f"Action: {action}")
        logger.info(f"Target object: {target_object}")
        
        try:
            role = self.get_user_role(user)
            logger.info(f"User role: {role}")
        except Exception as e:
            logger.error(f"Error getting user role: {e}")
            raise
        
        if action in ['manage_club', 'create_club']:
            logger.info(f"Processing action: {action}")
            
            if role == 'superadmin':
                logger.info(f"Superadmin access granted")
                return True
            elif role == 'ambassador':
                logger.info(f"Ambassador role detected")
                if target_object:  # For manage_club
                    logger.info(f"Checking university match: user.university={getattr(user, 'university', 'N/A')}, target.university={getattr(target_object, 'university', 'N/A')}")
                    result = user.university == target_object.university
                    logger.info(f"University match result: {result}")
                    return result
                logger.info(f"No target object - allowing create_club")
                return True  # For create_club (university will be set to user's)
            
            logger.warning(f"Role '{role}' not authorized for action '{action}'")
            return False
        
        logger.info(f"Default case - allowing action: {action}")
        return True
    
class JoinRequestPermission(HybridPermission):
    """Join request permissions with hybrid approach"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return True
    
    def has_object_permission(self, request, view, obj):
        action = getattr(view, 'action', None)
        user = request.user
    
        
        if action != 'join':
            return True  # Skip this permission for other actions
            
        # Handle the 'join' action (POST /api/clubs/{id}/join)
        if action == 'join':
            # First check Django permission
            has_django_perm = user.has_perm('clubs.add_joinrequest')
            
            # Then check business rules
            has_business_perm = self.check_permission(
                user,
                'clubs',  # app_label
                'add_joinrequest',  # Django permission
                'add_joinrequest',   # Business rule action
                obj  # Target object (the club)
            )
            
            # Debug logging
            logger.debug(f"Django permission check: {has_django_perm}")
            logger.debug(f"Business rule check: {has_business_perm}")
            logger.debug(f"User university: {getattr(user, 'university', 'None')}")
            logger.debug(f"Club university: {getattr(obj, 'university', 'None')}")
            
            return has_django_perm and has_business_perm
        
        # For actual JoinRequest objects (if you have separate JoinRequest endpoints)
        if hasattr(obj, 'user') and hasattr(obj, 'status'):  # This is a JoinRequest object
            if action in ['retrieve', 'join_requests']:
                return self.check_permission(
                    request.user,
                    'view_join_requests',
                    'view_join_requests',
                    obj
                )
            
            elif action in ['approve', 'reject']:
                permission_name = f'{action}_join_request'
                return self.check_permission(
                    request.user,
                    permission_name,
                    f'{action}_join_request',
                    obj
                )
            
            elif action in ['update', 'destroy']:
                if obj.user == request.user and obj.status == 'pending':
                    return True
                
                return self.check_permission(
                    request.user,
                    'manage_join_requests',
                    'manage_join_requests',
                    obj
                )
        
        return True
    
    def validate_business_rules(self, user, action, target_object=None):
        """Override to add join request specific rules"""
        role = self.get_user_role(user)
        
        if action == 'add_joinrequest':
            # Basic validation: authenticated users can create join requests
            if not user.is_authenticated:
                return False
            
            # Business rule: User must be from same university as club
            
            
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
    
    
