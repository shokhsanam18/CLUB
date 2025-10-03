from core.permissions import HybridPermission
import logging

logger = logging.getLogger(__name__)

class EventPermission(HybridPermission):
    """Event permissions"""
    
    def has_permission(self, request, view):
        logger.info(f"=== has_permission called ===")
        logger.info(f"User: {request.user}")
        logger.info(f"Is authenticated: {request.user.is_authenticated}")
        logger.info(f"Action: {getattr(view, 'action', None)}")
        
        if not request.user.is_authenticated:
            logger.error("DENIED: User not authenticated")
            return False
        
        action = getattr(view, 'action', None)
        
        if action in ['list', 'retrieve']:
            logger.info("ALLOWED: List/retrieve action")
            return True
        
        if action == 'create':
            result = self.check_permission(
                request.user,
                'events',  # app_label
                'create_events',
                'create_event'
            )
            logger.info(f"Create permission result: {result}")
            return result
        
        logger.info("ALLOWED: Default permission granted")
        return True
    
    def has_object_permission(self, request, view, obj):
        logger.info(f"=== has_object_permission called ===")
        logger.info(f"User: {request.user}")
        logger.info(f"Action: {getattr(view, 'action', None)}")
        logger.info(f"Object: {obj}")
        logger.info(f"User roles: {getattr(request.user, 'all_roles', 'N/A')}")
        logger.info(f"User is_staff: {request.user.is_staff}")
        logger.info(f"User is_superuser: {request.user.is_superuser}")
        
        action = getattr(view, 'action', None)
        user = request.user
        
        if action == 'retrieve':
            logger.info("ALLOWED: Retrieve action")
            return True
        
        if action in ['update', 'partial_update', 'destroy']:
            result = self.check_permission(
                user,
                'events',  # app_label
                'manage_events',
                'manage_event',
                obj
            )
            logger.info(f"Update/destroy permission result: {result}")
            return result
        
        # Handle custom actions that require event management permissions
        if action in ['get_statistics', 'update_attendance', 'get_registrations']:
            logger.info(f"Checking custom action: {action}")
            
            # Check if user is event creator, club admin, or system admin
            if user.is_staff or user.is_superuser:
                logger.info("ALLOWED: User is staff/superuser")
                return True
            
            if obj.created_by == user:
                logger.info("ALLOWED: User is event creator")
                return True
            
            
            
            # For volunteers, check if they can manage this specific event
            result = self.check_permission(
                user,
                'events',
                'manage_events', 
                'manage_event',
                obj
            )
            logger.info(f"Volunteer manage event permission result: {result}")
            return result
        
        # For registration/unregistration, allow authenticated users
        if action in ['register_for_event', 'unregister_from_event']:
            logger.info("ALLOWED: Registration action")
            return True
        
        logger.error(f"DENIED: No matching action found for {action}")
        return False
    
    def validate_business_rules(self, user, action, target_object=None):
        """Business rules for events"""
        logger.info(f"=== validate_business_rules called ===")
        logger.info(f"User: {user}")
        logger.info(f"Action: {action}")
        logger.info(f"Target object: {target_object}")
        
        role = self.get_user_role(user)
        logger.info(f"User role: {role}")
        
        if action == 'create_event':
            if role == 'superadmin':
                logger.info("ALLOWED: Superadmin can create")
                return True
            elif role == 'ambassador':
                logger.info("ALLOWED: Ambassador can create")
                result = target_object and user.university == target_object.club.university
                return result
            elif role == 'volunteer':
                result = user.club is not None
                logger.info(f"Volunteer create permission (has club): {result}")
                return result
            logger.error("DENIED: No matching role for create")
            return False
        
        elif action == 'manage_event':
            if role == 'superadmin':
                logger.info("ALLOWED: Superadmin can manage")
                return True
            elif role == 'ambassador':
                result = target_object and user.university == target_object.club.university
                logger.info(f"Ambassador manage permission (same university): {result}")
                return result
            elif role == 'volunteer':
                result = (target_object and 
                         (user.club == target_object.club or target_object.created_by == user))
                logger.info(f"Volunteer manage permission (same club or creator): {result}")
                return result
            logger.error("DENIED: No matching role for manage")
            return False
        
        logger.info("ALLOWED: Default business rule")
        return True
    
class EventReportPermission(HybridPermission):
    """
    Permission class for event reports.
    """
    
    def has_permission(self, request, view):
        user = request.user
        action =  getattr(view, 'action', None)
        role = self.get_user_role(user)
        
        if not user.is_authenticated:
            return False
        
        if action in ['list', 'retrieve', 'pending_reports', 'get_attendance_data']:
            if user.is_staff or user.is_superuser:
                return True
            if role == 'volunteer':
                return True
            
            return False

        if action == 'create':
            if role == 'volunteer':
                return True
            # Superadmins can also create (for administrative purposes)
            if user.is_staff or user.is_superuser or role == 'superadmin':
                return True
            return False
        
        if action in ['update', 'partial_update', 'destroy']:
            return True  # Will check has_object_permission
        
        return True
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        role = self.get_user_role(user)
        action = getattr(view, 'action', None)
        event = obj.event
        
        if user.is_staff or user.is_superuser:
            return True
        
        if action in ['retrieve', 'get_attendance_data']:
            # Event creator can view
            if event.created_by == user:
                return True
            # Report submitter can view
            if obj.submitted_by == user:
                return True
            # Volunteers from same club can view
            if role == 'volunteer' and hasattr(user, 'club') and user.club == event.club:
                return True
            return False
        
        if action in ['update', 'partial_update', 'destroy']:
            
            if user.is_staff or user.is_superuser:
                return True
            # Only the submitter (volunteer) can update/delete their own report
            if obj.submitted_by == user and role == 'volunteer':
                return True
            return False

        return False
        
        
        