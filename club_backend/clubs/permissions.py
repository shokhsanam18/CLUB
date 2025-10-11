from core.permissions import HybridPermission
import logging 
from drf_yasg import openapi
logger = logging.getLogger(__name__)

class ClubPermission(HybridPermission):
    """Club permissions"""
    
    @classmethod
    def get_error_responses(cls, action=None):
        """Return Swagger error response schemas for this permission class."""
        from core.swagger_utils import STANDARD_ERROR_SCHEMAS
        
        error_responses = {}
        
        # === CREATE ACTION ERRORS ===
        if action == 'create' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - insufficient role or university mismatch",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "insufficient_role": {
                            "error": "Permission denied",
                            "detail": "You don't have permission to create clubs. Only ambassadors and superadmins can create clubs.",
                            "code": "create_club_denied",
                            "user_role": "volunteer"
                        },
                        "university_mismatch": {
                            "error": "University mismatch",
                            "detail": "Ambassadors can only create clubs within their assigned university.",
                            "code": "university_mismatch",
                            "user_role": "ambassador"
                        },
                        "no_university_assigned": {
                            "error": "No university assigned",
                            "detail": "You must be assigned to a university before creating clubs.",
                            "code": "no_university_assigned",
                            "user_role": "ambassador"
                        }
                    }
                }
            )
            
            error_responses[400] = openapi.Response(
                description="Validation error during club creation",
                schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                examples={
                    "application/json": {
                        "duplicate_club_name": {
                            "error": "Validation error",
                            "detail": "A club with this name already exists in your university.",
                            "code": "duplicate_club_name"
                        },
                        "invalid_university": {
                            "error": "Validation error",
                            "detail": "The specified university is not valid or does not exist.",
                            "code": "invalid_university"
                        }
                    }
                }
            )
        
        # === UPDATE/DELETE ACTION ERRORS ===
        if action in ['update', 'partial_update', 'destroy'] or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - insufficient permissions to manage club",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "not_club_admin": {
                            "error": "Club admin required",
                            "detail": "Only the club administrator can manage this club.",
                            "code": "not_club_admin",
                            "user_role": "ambassador"
                        },
                        "cross_university_denied": {
                            "error": "University access denied",
                            "detail": "You can only manage clubs within your university.",
                            "code": "cross_university_denied",
                            "user_role": "ambassador"
                        },
                        "insufficient_role": {
                            "error": "Permission denied",
                            "detail": "You don't have permission to manage this club. Only the club admin or superadmins can modify club details.",
                            "code": "manage_club_denied",
                            "user_role": "volunteer"
                        },
                        "not_ambassador_admin": {
                            "error": "Not club administrator",
                            "detail": "Ambassadors can only manage clubs they administer.",
                            "code": "not_ambassador_admin",
                            "user_role": "ambassador"
                        }
                    }
                }
            )
            
            if action == 'destroy':
                error_responses[400] = openapi.Response(
                    description="Cannot delete club due to business rules",
                    schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                    examples={
                        "application/json": {
                            "has_active_events": {
                                "error": "Cannot delete club",
                                "detail": "Club cannot be deleted because it has active events. Cancel or complete all events first.",
                                "code": "club_has_active_events",
                                "active_events_count": 3
                            },
                            "has_pending_requests": {
                                "error": "Cannot delete club",
                                "detail": "Club cannot be deleted because it has pending join requests. Process all requests first.",
                                "code": "club_has_pending_requests",
                                "pending_requests_count": 5
                            }
                        }
                    }
                )
        
        # === STATS ACTION ERRORS ===
        if action == 'stats' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - insufficient access to club statistics",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "wrong_club_stats": {
                            "error": "Access denied",
                            "detail": "You can only view statistics for your assigned club.",
                            "code": "wrong_club_stats",
                            "user_role": "volunteer"
                        },
                        "not_your_club_stats": {
                            "error": "Admin access required",
                            "detail": "You can only view statistics for clubs you administer.",
                            "code": "not_your_club_stats",
                            "user_role": "ambassador"
                        },
                        "stats_permission_denied": {
                            "error": "Insufficient permissions",
                            "detail": "You don't have permission to view club statistics.",
                            "code": "stats_permission_denied",
                            "user_role": "member"
                        },
                        "university_mismatch_stats": {
                            "error": "University access denied",
                            "detail": "You can only view statistics for clubs within your university.",
                            "code": "cross_university_stats_denied",
                            "user_role": "ambassador"
                        }
                    }
                }
            )
        
        # === BULK ACTIONS ERRORS ===
        if action == 'bulk_action' or action == 'bulk-action' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - insufficient permissions for bulk operations",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "bulk_operation_denied": {
                            "error": "Bulk operation denied",
                            "detail": "Only superadmins can perform bulk operations on clubs.",
                            "code": "bulk_operation_denied",
                            "user_role": "ambassador"
                        },
                        "partial_bulk_denied": {
                            "error": "Partial bulk operation denied",
                            "detail": "You don't have permission to perform bulk operations on some of the selected clubs.",
                            "code": "partial_bulk_denied",
                            "allowed_clubs": [1, 3, 5],
                            "denied_clubs": [2, 4, 6]
                        }
                    }
                }
            )
            
            error_responses[400] = openapi.Response(
                description="Invalid bulk operation request",
                schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                examples={
                    "application/json": {
                        "no_clubs_selected": {
                            "error": "Validation error",
                            "detail": "No clubs selected for bulk operation.",
                            "code": "no_clubs_selected"
                        },
                        "invalid_action": {
                            "error": "Validation error",
                            "detail": "Invalid bulk action specified. Valid actions are: activate, deactivate, delete.",
                            "code": "invalid_bulk_action"
                        },
                        "too_many_clubs": {
                            "error": "Validation error",
                            "detail": "Too many clubs selected. Maximum 50 clubs allowed per bulk operation.",
                            "code": "too_many_clubs_selected",
                            "max_allowed": 50,
                            "selected_count": 75
                        }
                    }
                }
            )
        
        # === JOIN REQUESTS VIEWING ERRORS ===
        if action == 'join_requests' or action == 'join-requests' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot view join requests",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "view_requests_denied": {
                            "error": "Permission denied",
                            "detail": "You don't have permission to view join requests. Only club administrators and superadmins can access this data.",
                            "code": "view_requests_denied",
                            "user_role": "volunteer"
                        },
                        "wrong_university_requests": {
                            "error": "University access denied",
                            "detail": "You can only view join requests for clubs within your university.",
                            "code": "cross_university_requests_denied",
                            "user_role": "ambassador"
                        },
                        "not_club_admin_requests": {
                            "error": "Not club administrator",
                            "detail": "You can only view join requests for clubs you administer.",
                            "code": "not_club_admin_requests",
                            "user_role": "ambassador"
                        }
                    }
                }
            )
        
        # === APPROVE/REJECT JOIN REQUEST ERRORS ===
        if action in ['approve_join_request', 'reject_join_request'] or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot approve/reject requests",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "approve_reject_denied": {
                            "error": "Permission denied",
                            "detail": "Only club administrators and superadmins can approve or reject join requests.",
                            "code": "approve_reject_denied",
                            "user_role": "volunteer"
                        },
                        "wrong_university_approval": {
                            "error": "University access denied",
                            "detail": "You can only approve/reject requests for clubs within your university.",
                            "code": "cross_university_approval_denied",
                            "user_role": "ambassador"
                        },
                        "not_your_club_approval": {
                            "error": "Not club administrator",
                            "detail": "You can only approve/reject join requests for clubs you administer.",
                            "code": "not_club_admin_approval",
                            "user_role": "ambassador"
                        }
                    }
                }
            )
            
            error_responses[400] = openapi.Response(
                description="Request cannot be processed",
                schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                examples={
                    "application/json": {
                        "request_already_processed": {
                            "error": "Request already processed",
                            "detail": "This join request has already been approved or rejected.",
                            "code": "request_already_processed",
                            "current_status": "approved"
                        },
                        "user_already_member": {
                            "error": "User already member",
                            "detail": "User is already a member of this club.",
                            "code": "user_already_member"
                        },
                        "user_in_other_club": {
                            "error": "User in another club",
                            "detail": "User is already a member of another club and must leave first.",
                            "code": "user_in_other_club"
                        }
                    }
                }
            )
            
            error_responses[404] = openapi.Response(
                description="Join request not found",
                schema=STANDARD_ERROR_SCHEMAS['server_error'],
                examples={
                    "application/json": {
                        "request_not_found": {
                            "error": "Join request not found",
                            "detail": "The specified join request does not exist or has been deleted.",
                            "code": "join_request_not_found"
                        }
                    }
                }
            )
        
        # === LEAVE CLUB ERRORS ===
        if action == 'leave' or action is None:
            error_responses[400] = openapi.Response(
                description="Cannot leave club",
                schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                examples={
                    "application/json": {
                        "not_club_member": {
                            "error": "Not a member",
                            "detail": "You are not a member of this club.",
                            "code": "not_club_member"
                        },
                        "admin_cannot_leave": {
                            "error": "Admin cannot leave",
                            "detail": "Club administrators cannot leave their club. Transfer admin rights first.",
                            "code": "admin_cannot_leave"
                        },
                        "has_pending_events": {
                            "error": "Cannot leave club",
                            "detail": "You cannot leave because you have created events that are still pending or upcoming.",
                            "code": "has_pending_events",
                            "pending_events_count": 2
                        }
                    }
                }
            )
        
        return error_responses
    
    def has_permission(self, request, view):
        logger.info(f"[ClubPermission] === has_permission called ===")
        logger.info(f"[ClubPermission] User: {request.user}")
        logger.info(f"[ClubPermission] Is authenticated: {request.user.is_authenticated}")
        logger.info(f"[ClubPermission] Request method: {request.method}")
        
        # if not request.user.is_authenticated:
        #     logger.warning(f"[ClubPermission] User not authenticated: {request.user}")
        #     return False
        
        action = getattr(view, 'action', None)
        logger.info(f"View action: {action}")
        
        if action in ['list', 'retrieve']:
            logger.info(f"[ClubPermission] Action '{action}' allowed - returning True")
            return True
        
        if action == 'create':
            logger.info(f"[ClubPermission] Action 'create' - checking permissions...")
            try:
                result = self.check_permission(
                    request.user,
                    'clubs',  # app_label
                    'create_clubs',
                    'create_club'
                )
                logger.info(f"[ClubPermission] create permission check result: {result}")
                return result
            except Exception as e:
                logger.error(f"[ClubPermission] Error in check_permission for create: {e}")
                raise
        
        logger.info(f"[ClubPermission] Default case - returning True for action: {action}")
        return True
    
    def has_object_permission(self, request, view, obj):
        logger.info(f"[ClubPermission] === has_object_permission called ===")
        logger.info(f"[ClubPermission] User: {request.user}")
        logger.info(f"[ClubPermission] Object: {obj}")
        logger.info(f"[ClubPermission] Object type: {type(obj)}")
        
        # Log user role
        try:
            user_role = self.get_user_role(request.user)
            logger.info(f"[ClubPermission] User role: {user_role}")
        except Exception as e:
            logger.error(f"[ClubPermission] Error getting user role in has_object_permission: {e}")
            # Continue execution even if role fetch fails
        
        action = getattr(view, 'action', None)
        logger.info(f"[ClubPermission] View action: {action}")
        
        if action in ['retrieve', 'stats']:
            if action == 'stats':
                role = self.get_user_role(request.user)
                if role == 'superadmin':
                    return True
                elif role == 'ambassador':
                    return request.user.id == obj.admin.id
                elif role == 'volunteer':
                    return hasattr(request.user, 'club') and request.user.club == obj
                
                return False
            
            return True
        
        if action in ['join', 'join_requests', 'approve_join_request', 'reject_join_request']:
            # Allow join requests - permission is handled by JoinRequestPermission
            logger.info(f"[ClubPermission] Action {action} allowed - returning True")
            return True
        
        if action == 'leave':
            logger.info(f"[ClubPermission] Action {action} is allowed - returning True")
            return True
        
        if action in ['update', 'partial_update', 'destroy']:
            logger.info(f"[ClubPermission] Action '{action}' - checking permissions...")
            try:
                result = self.check_permission(
                    request.user,
                    'clubs',  # app_label
                    'manage_clubs',
                    'manage_club',
                    obj
                )
                logger.info(f"[ClubPermission] manage permission check result: {result}")
                return result
            except Exception as e:
                logger.error(f"[ClubPermission] Error in check_permission for {action}: {e}")
                raise
        
        logger.warning(f"[ClubPermission] No matching action - returning False for action: {action}")
        return False
    
    def validate_business_rules(self, user, action, target_object=None):
        """Business rules for clubs"""
        logger.info(f"[ClubPermission] === validate_business_rules called ===")
        logger.info(f"[ClubPermission] User: {user}")
        logger.info(f"[ClubPermission] Action: {action}")
        logger.info(f"[ClubPermission] Target object: {target_object}")
        
        try:
            role = self.get_user_role(user)
            logger.info(f"[ClubPermission] User role: {role}")
        except Exception as e:
            logger.error(f"[ClubPermission] Error getting user role: {e}")
            raise
        
        if action in ['manage_club', 'create_club']:
            logger.info(f"[ClubPermission] Processing action: {action}")
            
            if role == 'superadmin':
                logger.info(f"[ClubPermission] Superadmin access granted")
                return True
            elif role == 'ambassador':
                logger.info(f"[ClubPermission] Ambassador role detected")
                if target_object:  # For manage_club
                    logger.info(f"[ClubPermission] Checking university match: user.university={getattr(user, 'university', 'N/A')}, target.university={getattr(target_object, 'university', 'N/A')}")
                    result = user.university == target_object.university and user.id == target_object.admin.id
                    logger.info(f"[ClubPermission] University match result: {result}, {user.id}, {target_object.admin.id}")
                    return result
                logger.info(f"[ClubPermission] No target object - allowing create_club")
                return True  # For create_club (university will be set to user's)
            
            logger.warning(f"[ClubPermission] Role '{role}' not authorized for action '{action}'")
            return False
        
        logger.info(f"[ClubPermission] Default case - allowing action: {action}")
        return True
    
class JoinRequestPermission(HybridPermission):
    """Join request permissions with hybrid approach"""
    
    @classmethod
    def get_error_responses(cls, action=None):
        """Return comprehensive error response schemas for join requests."""
        from core.swagger_utils import STANDARD_ERROR_SCHEMAS
        
        error_responses = {}
        
        # === JOIN ACTION ERRORS ===
        if action == 'join' or action is None:
            error_responses[400] = openapi.Response(
                description="Business rule validation failed",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'error': openapi.Schema(type=openapi.TYPE_STRING, example="Already in club"),
                        'detail': openapi.Schema(type=openapi.TYPE_STRING, example="You are already a member of another club. Leave your current club before joining a new one."),
                        'code': openapi.Schema(type=openapi.TYPE_STRING, example="already_club_member"),
                        'current_club': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'id': openapi.Schema(type=openapi.TYPE_INTEGER, example=5),
                                'name': openapi.Schema(type=openapi.TYPE_STRING, example="Engineering Club")
                            },
                            description="Details of user's current club"
                        ),
                        'request_id': openapi.Schema(type=openapi.TYPE_INTEGER, example=123, description="Existing request ID if applicable"),
                        'status': openapi.Schema(type=openapi.TYPE_STRING, example="pending", description="Current request status")
                    }
                ),
                examples={
                    "application/json": {
                        "already_club_member": {
                            "error": "Already in club",
                            "detail": "You are already a member of 'Engineering Club'. Leave your current club before joining a new one.",
                            "code": "already_club_member",
                            "current_club": {
                                "id": 5,
                                "name": "Engineering Club"
                            }
                        },
                        "pending_request_exists": {
                            "error": "Pending request exists",
                            "detail": "You already have a pending join request for this club.",
                            "code": "pending_request_exists",
                            "request_id": 123,
                            "status": "pending"
                        },
                        "already_approved": {
                            "error": "Already approved",
                            "detail": "You are already a member of this club.",
                            "code": "already_approved_member",
                            "request_id": 124,
                            "status": "approved"
                        }
                    }
                }
            )
            
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot join club",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "django_permission_denied": {
                            "error": "Permission denied",
                            "detail": "You don't have permission to join clubs.",
                            "code": "join_permission_denied"
                        },
                        "business_rule_denied": {
                            "error": "Permission denied",
                            "detail": "You don't have permission to submit join requests for this club.",
                            "code": "join_business_rule_denied"
                        },
                        "resubmit_denied": {
                            "error": "Permission denied",
                            "detail": "You don't have permission to resubmit this join request.",
                            "code": "resubmit_permission_denied"
                        }
                    }
                }
            )
        
        # === VIEW JOIN REQUESTS ERRORS ===
        if action == 'view_join_requests' or action == 'join_requests' or action is None:
            error_responses[403] = openapi.Response(
                description="Access denied - insufficient permissions to view join requests",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "not_own_request": {
                            "error": "Access denied",
                            "detail": "You can only view your own join requests or requests for clubs you administer.",
                            "code": "join_requests_view_denied"
                        },
                        "ambassador_wrong_university": {
                            "error": "University access denied",
                            "detail": "You can only view join requests for clubs within your university.",
                            "code": "cross_university_requests_denied"
                        },
                        "insufficient_role": {
                            "error": "Insufficient permissions",
                            "detail": "You don't have permission to view join requests. Only club administrators and superadmins can access this data.",
                            "code": "view_requests_role_denied"
                        }
                    }
                }
            )
        
        # === APPROVE JOIN REQUEST ERRORS ===
        if action in ['approve_join_request', 'approve'] or action is None:
            error_responses[400] = openapi.Response(
                description="Cannot approve join request",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'error': openapi.Schema(type=openapi.TYPE_STRING, example="Request cannot be approved"),
                        'detail': openapi.Schema(type=openapi.TYPE_STRING, example="Join request is already approved."),
                        'code': openapi.Schema(type=openapi.TYPE_STRING, example="already_processed"),
                        'request_id': openapi.Schema(type=openapi.TYPE_INTEGER, example=123),
                        'current_status': openapi.Schema(type=openapi.TYPE_STRING, example="approved")
                    }
                ),
                examples={
                    "application/json": {
                        "already_processed": {
                            "error": "Request already processed",
                            "detail": "Join request is already approved.",
                            "code": "already_approved",
                            "request_id": 123,
                            "current_status": "approved"
                        },
                        "user_already_member": {
                            "error": "User already member",
                            "detail": "User is already a member of this club.",
                            "code": "user_already_member"
                        }
                    }
                }
            )
            
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot approve requests",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "not_club_admin": {
                            "error": "Admin permission required",
                            "detail": "Only club administrators and superadmins can approve join requests.",
                            "code": "approve_permission_denied"
                        },
                        "ambassador_wrong_university": {
                            "error": "University access denied",
                            "detail": "You can only approve requests for clubs within your university.",
                            "code": "cross_university_approval_denied"
                        },
                        "not_ambassador_admin": {
                            "error": "Not club administrator",
                            "detail": "You can only approve join requests for clubs you administer.",
                            "code": "not_club_admin_approval"
                        }
                    }
                }
            )
            
            error_responses[404] = openapi.Response(
                description="Join request not found",
                schema=STANDARD_ERROR_SCHEMAS['server_error'],
                examples={
                    "application/json": {
                        "request_not_found": {
                            "error": "Join request not found",
                            "detail": "The specified join request does not exist or has been deleted.",
                            "code": "join_request_not_found"
                        }
                    }
                }
            )
        
        # === REJECT JOIN REQUEST ERRORS ===
        if action in ['reject_join_request', 'reject'] or action is None:
            error_responses[400] = openapi.Response(
                description="Cannot reject join request",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'error': openapi.Schema(type=openapi.TYPE_STRING, example="Request cannot be rejected"),
                        'detail': openapi.Schema(type=openapi.TYPE_STRING, example="Join request is already rejected."),
                        'code': openapi.Schema(type=openapi.TYPE_STRING, example="already_rejected"),
                        'request_id': openapi.Schema(type=openapi.TYPE_INTEGER, example=123),
                        'current_status': openapi.Schema(type=openapi.TYPE_STRING, example="rejected")
                    }
                ),
                examples={
                    "application/json": {
                        "already_rejected": {
                            "error": "Request already processed",
                            "detail": "Join request is already rejected.",
                            "code": "already_rejected",
                            "request_id": 123,
                            "current_status": "rejected"
                        },
                        "missing_reason": {
                            "error": "Rejection reason required",
                            "detail": "A reason must be provided when rejecting a join request.",
                            "code": "rejection_reason_required"
                        }
                    }
                }
            )
            
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot reject requests",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "not_club_admin": {
                            "error": "Admin permission required",
                            "detail": "Only club administrators and superadmins can reject join requests.",
                            "code": "reject_permission_denied"
                        },
                        "ambassador_wrong_university": {
                            "error": "University access denied",
                            "detail": "You can only reject requests for clubs within your university.",
                            "code": "cross_university_rejection_denied"
                        }
                    }
                }
            )
            
            error_responses[404] = openapi.Response(
                description="Join request not found",
                schema=STANDARD_ERROR_SCHEMAS['server_error']
            )
        
        # === MANAGE JOIN REQUESTS ERRORS ===
        if action == 'manage_join_requests' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot manage join requests",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "insufficient_role": {
                            "error": "Management permission denied",
                            "detail": "Only club administrators and superadmins can manage join requests.",
                            "code": "manage_requests_permission_denied"
                        },
                        "ambassador_wrong_university": {
                            "error": "University access denied",
                            "detail": "You can only manage requests for clubs within your university.",
                            "code": "cross_university_manage_denied"
                        }
                    }
                }
            )
        
        return error_responses
    
    def has_permission(self, request, view):
        # if not request.user.is_authenticated:
        #     return False
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
            logger.debug(f"[JoinRequestPermission] Django permission check: {has_django_perm}")
            logger.debug(f"[JoinRequestPermission] Business rule check: {has_business_perm}")
            logger.debug(f"[JoinRequestPermission] User university: {getattr(user, 'university', 'None')}")
            logger.debug(f"[JoinRequestPermission] Club university: {getattr(obj, 'university', 'None')}")
            
            return has_django_perm and has_business_perm
        
        if hasattr(obj, 'user') and hasattr(obj, 'status'):  
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
            
            if not user.is_authenticated:
                return False
            
            
            
            
            if hasattr(user, 'club') and user.club and user.club != target_object:
                return False    

            return True 

        if action == 'view_join_requests':
            
            if target_object and target_object.user == user:
                return True
            
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                return target_object and (user.university == target_object.club.university and
                                          user.id == target_object.admin.id)
            return False
        
        elif action in ['approve_join_request', 'reject_join_request']:
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                return target_object and (user.university == target_object.club.university and
                                          user.id == target_object.admin.id)
            return False
        
        elif action == 'manage_join_requests':
            if role == 'superadmin':
                return True
            elif role == 'ambassador':
                return target_object and (user.university == target_object.club.university and
                                          user.id == target_object.admin.id)
            return False
        
       
        return super().validate_business_rules(user, action, target_object)
    
    
