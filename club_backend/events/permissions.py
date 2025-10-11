from core.permissions import HybridPermission
import logging
from drf_yasg import openapi
logger = logging.getLogger(__name__)

class EventPermission(HybridPermission):
    """Event permissions"""
    
    @classmethod
    def get_error_responses(cls, action=None):
        """Return comprehensive error response schemas for event operations."""
        from drf_yasg import openapi
        from core.swagger_utils import STANDARD_ERROR_SCHEMAS
        
        error_responses = {}
        
        # === CREATE EVENT ERRORS ===
        if action == 'create' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - insufficient role or no club assignment",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "insufficient_role": {
                            "error": "Permission denied",
                            "detail": "You don't have permission to create events. Only volunteers, ambassadors, and superadmins can create events.",
                            "code": "create_event_denied",
                            "user_role": "member"
                        },
                        "volunteer_no_club": {
                            "error": "No club assigned",
                            "detail": "You must be assigned to a club before you can create events.",
                            "code": "volunteer_no_club",
                            "user_role": "volunteer"
                        },
                        "role_not_authorized": {
                            "error": "Role not authorized",
                            "detail": "Your user role is not authorized to create events.",
                            "code": "role_create_event_denied",
                            "user_role": "guest"
                        }
                    }
                }
            )
            
            error_responses[400] = openapi.Response(
                description="Validation error during event creation",
                schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                examples={
                    "application/json": {
                        "invalid_date": {
                            "error": "Validation error",
                            "detail": "Event date cannot be in the past.",
                            "code": "invalid_event_date"
                        },
                        "duplicate_event": {
                            "error": "Validation error",
                            "detail": "An event with this title already exists for the same date and club.",
                            "code": "duplicate_event"
                        },
                        "invalid_club": {
                            "error": "Validation error",
                            "detail": "You can only create events for your assigned club.",
                            "code": "invalid_club_assignment"
                        }
                    }
                }
            )
        
        # === UPDATE/DELETE EVENT ERRORS ===
        if action in ['update', 'partial_update', 'destroy'] or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - insufficient permissions to manage event",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "not_event_creator": {
                            "error": "Permission denied",
                            "detail": "You don't have permission to manage this event. Only the event creator, club members, or superadmins can manage events.",
                            "code": "manage_event_denied",
                            "user_role": "volunteer"
                        },
                        "cross_university_event": {
                            "error": "University mismatch",
                            "detail": "You can only manage events for clubs within your university.",
                            "code": "cross_university_event_denied",
                            "user_role": "ambassador"
                        },
                        "wrong_club_event": {
                            "error": "Club mismatch",
                            "detail": "You can only manage events for your assigned club or events you created.",
                            "code": "wrong_club_event",
                            "user_role": "volunteer"
                        },
                        "ambassador_not_admin": {
                            "error": "Not club administrator",
                            "detail": "Ambassadors can only manage events for clubs they administer.",
                            "code": "ambassador_not_club_admin",
                            "user_role": "ambassador"
                        }
                    }
                }
            )
            
            if action == 'destroy':
                error_responses[400] = openapi.Response(
                    description="Cannot delete event due to business rules",
                    schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                    examples={
                        "application/json": {
                            "has_registrations": {
                                "error": "Cannot delete event",
                                "detail": "Event cannot be deleted because it has registered users. Cancel registrations first.",
                                "code": "event_has_registrations",
                                "registrations_count": 15
                            },
                            "event_started": {
                                "error": "Cannot delete event",
                                "detail": "Event cannot be deleted because it has already started or ended.",
                                "code": "event_already_started"
                            },
                            "has_reports": {
                                "error": "Cannot delete event",
                                "detail": "Event cannot be deleted because it has submitted reports.",
                                "code": "event_has_reports"
                            }
                        }
                    }
                )
        
        # === EVENT STATISTICS/MANAGEMENT ERRORS ===
        if action in ['get_statistics', 'update_attendance', 'get_registrations'] or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - insufficient access to event data",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "stats_access_denied": {
                            "error": "Statistics access denied",
                            "detail": "You don't have permission to view event statistics. Only event creators, club members, and administrators can access this data.",
                            "code": "event_stats_denied",
                            "user_role": "member"
                        },
                        "attendance_update_denied": {
                            "error": "Attendance update denied",
                            "detail": "You don't have permission to update attendance. Only event managers can modify attendance records.",
                            "code": "attendance_update_denied",
                            "user_role": "volunteer"
                        },
                        "registrations_view_denied": {
                            "error": "Registrations access denied",
                            "detail": "You don't have permission to view event registrations.",
                            "code": "registrations_view_denied",
                            "user_role": "member"
                        },
                        "not_event_manager": {
                            "error": "Not event manager",
                            "detail": "You can only access statistics for events you created or events in your club.",
                            "code": "not_event_manager",
                            "user_role": "volunteer"
                        }
                    }
                }
            )
        
        # === EVENT REGISTRATION ERRORS ===
        if action in ['register_for_event', 'unregister_from_event'] or action is None:
            error_responses[400] = openapi.Response(
                description="Cannot register/unregister for event",
                schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                examples={
                    "application/json": {
                        "event_past": {
                            "error": "Cannot register",
                            "detail": "Cannot register for past events.",
                            "code": "event_registration_closed"
                        },
                        "already_registered": {
                            "error": "Already registered",
                            "detail": "You are already registered for this event.",
                            "code": "already_registered"
                        },
                        "not_registered": {
                            "error": "Not registered",
                            "detail": "You are not registered for this event.",
                            "code": "not_registered"
                        },
                        "event_full": {
                            "error": "Event full",
                            "detail": "This event has reached its maximum capacity.",
                            "code": "event_capacity_full",
                            "current_registrations": 100,
                            "max_capacity": 100
                        }
                    }
                }
            )
        
        return error_responses
    
    def has_permission(self, request, view):
        logger.info(f"=== [EventPermission] has_permission called ===")
        logger.info(f"[EventPermission] User: {request.user}")
        logger.info(f"[EventPermission] Is authenticated: {request.user.is_authenticated}")
        logger.info(f"[EventPermission] Action: {getattr(view, 'action', None)}")
        
        # if not request.user.is_authenticated:
        #     logger.error("[EventPermission] DENIED: User not authenticated")
        #     return False
        
        action = getattr(view, 'action', None)
        
        if action in ['list', 'retrieve']:
            logger.info("[EventPermission] ALLOWED: List/retrieve action")
            return True
        
        if action == 'create':
            result = self.check_permission(
                request.user,
                'events',  # app_label
                'create_events',
                'create_event'
            )
            logger.info(f"[EventPermission] Create permission result: {result}")
            return result
        
        logger.info("[EventPermission] ALLOWED: Default permission granted")
        return True
    
    def has_object_permission(self, request, view, obj):
        logger.info(f"[EventPermission] === has_object_permission called ===")
        logger.info(f"[EventPermission] User: {request.user}")
        logger.info(f"[EventPermission] Action: {getattr(view, 'action', None)}")
        logger.info(f"[EventPermission] Object: {obj}")
        logger.info(f"[EventPermission] User roles: {getattr(request.user, 'all_roles', 'N/A')}")
        logger.info(f"[EventPermission] User is_staff: {request.user.is_staff}")
        logger.info(f"[EventPermission] User is_superuser: {request.user.is_superuser}")
        
        action = getattr(view, 'action', None)
        user = request.user
        
        if action == 'retrieve':
            logger.info("[EventPermission] ALLOWED: Retrieve action")
            return True
        
        if action in ['update', 'partial_update', 'destroy']:
            result = self.check_permission(
                user,
                'events',  # app_label
                'manage_events',
                'manage_event',
                obj
            )
            logger.info(f"[EventPermission] Update/destroy permission result: {result}")
            return result
        
        # Handle custom actions that require event management permissions
        if action in ['get_statistics', 'update_attendance', 'get_registrations']:
            
            logger.info(f"[EventPermission] Checking custom action: {action}")
            
            # Check if user is event creator, club admin, or system admin
            if user.is_superuser:
                logger.info("[EventPermission] ALLOWED: User is superuser")
                return True
            
            
            
            if obj.created_by == user:
                logger.info("[EventPermission] ALLOWED: User is event creator")
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
        logger.info(f"=== [EventPermission] validate_business_rules called ===")
        logger.info(f"[EventPermission] User: {user}")
        logger.info(f"[EventPermission] Action: {action}")
        logger.info(f"[EventPermission] Target object: {target_object}")

        role = self.get_user_role(user)
        logger.info(f"[EventPermission] User role: {role}")

        if action == 'create_event':
            logger.info("[EventPermission] === Validating CREATE_EVENT business rules ===")
            logger.info("[EventPermission] NOTE: target_object is not needed for creation")

            if role == 'superadmin':
                logger.info("[EventPermission] ALLOWED: Superadmin can create")
                return True

            elif role == 'ambassador':
                logger.info("[EventPermission] User is ambassador")
                logger.info(f"[EventPermission] User university: {getattr(user, 'university', 'N/A')}")
                # Ambassadors can create events (club validation happens in serializer)
                logger.info("[EventPermission] ALLOWED: Ambassador can create events")
                return True

            elif role == 'volunteer':
                logger.info("[EventPermission] User is volunteer")
                user_club = getattr(user, 'club', None)
                logger.info(f"[EventPermission] User club: {user_club}")
                result = user_club is not None
                logger.info(f"[EventPermission] Volunteer create permission (has club): {result}")
                if not result:
                    logger.error("[EventPermission] DENIED: Volunteer has no club assigned")
                else:
                    logger.info("[EventPermission] ALLOWED: Volunteer has club assigned")
                return result

            else:
                logger.error(f"[EventPermission] DENIED: Role '{role}' cannot create events")
                return False

        elif action == 'manage_event':
            logger.info("[EventPermission] === Validating MANAGE_EVENT business rules ===")

            if not target_object:
                logger.error("[EventPermission] DENIED: target_object is required for manage_event")
                return False

            logger.info(f"[EventPermission] Event: {target_object.title} (ID: {target_object.id})")
            logger.info(f"[EventPermission] Event club: {target_object.club}")
            logger.info(f"[EventPermission] Event creator: {target_object.created_by}")

            if role == 'superadmin':
                logger.info("[EventPermission] ALLOWED: Superadmin can manage")
                return True

            elif role == 'ambassador':
                logger.info(f"[EventPermission] Checking ambassador university match")
                logger.info(f"[EventPermission] User university: {getattr(user, 'university', 'N/A')}")
                logger.info(f"[EventPermission] Event club university: {target_object.club.university}")
                result = target_object.club.admin_id == user.id
                if result:
                    logger.info("[EventPermission] ALLOWED: Ambassador managing event in their university")
                else:
                    logger.error("[EventPermission] DENIED: Event is not in ambassador's university")
                return result

            elif role == 'volunteer':
                logger.info(f"[EventPermission] Checking volunteer permissions")
                user_club = getattr(user, 'club', None)
                logger.info(f"[EventPermission] User club: {user_club}")
                logger.info(f"[EventPermission] Event club: {target_object.club}")
                logger.info(f"[EventPermission] Event creator: {target_object.created_by}")

                same_club = user_club == target_object.club
                is_creator = target_object.created_by == user

                logger.info(f"[EventPermission] Same club: {same_club}")
                logger.info(f"[EventPermission] Is creator: {is_creator}")

                result = same_club or is_creator
                if result:
                    logger.info("[EventPermission] ALLOWED: Volunteer can manage (same club or creator)")
                else:
                    logger.error("[EventPermission] DENIED: Volunteer cannot manage this event")
                return result

            else:
                logger.error(f"[EventPermission] DENIED: Role '{role}' cannot manage events")
                return False

        logger.info("[EventPermission] ALLOWED: Default business rule (no specific action matched)")
        return True
    
class EventReportPermission(HybridPermission):
    """
    Permission class for event reports.
    """
    @classmethod
    def get_error_responses(cls, action=None):
        """Return comprehensive error response schemas for event report operations."""
        from drf_yasg import openapi
        from core.swagger_utils import STANDARD_ERROR_SCHEMAS
        
        error_responses = {}
        
        # === CREATE REPORT ERRORS ===
        if action == 'create' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - only volunteers can create reports",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "role_denied": {
                            "error": "Report creation denied",
                            "detail": "Only volunteers can submit event reports. Please contact a volunteer to submit the report.",
                            "code": "report_create_role_denied",
                            "user_role": "member"
                        },
                        "not_authenticated": {
                            "error": "Authentication required",
                            "detail": "You must be logged in to submit event reports.",
                            "code": "report_auth_required"
                        }
                    }
                }
            )
            
            error_responses[400] = openapi.Response(
                description="Validation error during report creation",
                schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                examples={
                    "application/json": {
                        "event_not_ended": {
                            "error": "Event not ended",
                            "detail": "Reports can only be submitted for events that have ended.",
                            "code": "event_still_active"
                        },
                        "report_already_exists": {
                            "error": "Report exists",
                            "detail": "A report has already been submitted for this event.",
                            "code": "report_already_submitted"
                        },
                        "not_event_participant": {
                            "error": "Not event participant",
                            "detail": "You can only submit reports for events you created or attended.",
                            "code": "not_event_participant"
                        }
                    }
                }
            )
        
        # === VIEW REPORT ERRORS ===
        if action in ['list', 'retrieve', 'get_attendance_data'] or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - insufficient access to view reports",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "view_denied": {
                            "error": "Report access denied",
                            "detail": "You can only view reports you submitted, for events you created, or for events in your club.",
                            "code": "report_view_denied",
                            "user_role": "volunteer"
                        },
                        "cross_club_denied": {
                            "error": "Club access denied",
                            "detail": "You can only view reports for events within your assigned club.",
                            "code": "cross_club_report_denied",
                            "user_role": "volunteer"
                        },
                        "not_staff_volunteer": {
                            "error": "Insufficient permissions",
                            "detail": "You don't have permission to view event reports. Only volunteers, staff, and superusers can access reports.",
                            "code": "report_list_permission_denied",
                            "user_role": "member"
                        },
                        "not_report_stakeholder": {
                            "error": "Not report stakeholder",
                            "detail": "You can only view reports for events you're involved with (created, submitted, or club member).",
                            "code": "not_report_stakeholder"
                        }
                    }
                }
            )
        
        # === UPDATE/DELETE REPORT ERRORS ===
        if action in ['update', 'partial_update', 'destroy'] or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot modify report",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "not_submitter": {
                            "error": "Report modification denied",
                            "detail": "You can only modify reports you submitted.",
                            "code": "not_report_submitter",
                            "user_role": "volunteer"
                        },
                        "role_modify_denied": {
                            "error": "Role permission denied",
                            "detail": "Only volunteers can modify event reports.",
                            "code": "report_modify_role_denied",
                            "user_role": "ambassador"
                        },
                        "report_finalized": {
                            "error": "Report finalized",
                            "detail": "This report has been finalized and cannot be modified.",
                            "code": "report_finalized"
                        }
                    }
                }
            )
            
            error_responses[400] = openapi.Response(
                description="Cannot modify report due to business rules",
                schema=STANDARD_ERROR_SCHEMAS['validation_error'],
                examples={
                    "application/json": {
                        "deadline_passed": {
                            "error": "Modification deadline passed",
                            "detail": "Reports cannot be modified after 48 hours of submission.",
                            "code": "report_modification_deadline_passed"
                        },
                        "event_too_old": {
                            "error": "Event too old",
                            "detail": "Reports for events older than 30 days cannot be modified.",
                            "code": "event_report_too_old"
                        }
                    }
                }
            )
        
        # === PENDING REPORTS ERRORS ===
        if action == 'pending_reports' or action == 'pending' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot view pending reports",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "pending_access_denied": {
                            "error": "Pending reports access denied",
                            "detail": "You don't have permission to view pending reports. Only volunteers, staff, and superusers can access this data.",
                            "code": "pending_reports_access_denied",
                            "user_role": "member"
                        },
                        "no_events_to_report": {
                            "error": "No reportable events",
                            "detail": "You don't have any events that require reports.",
                            "code": "no_reportable_events"
                        }
                    }
                }
            )
        
        # === ATTENDANCE DATA ERRORS ===
        if action == 'get_attendance_data' or action == 'attendance_data' or action is None:
            error_responses[403] = openapi.Response(
                description="Permission denied - cannot access attendance data",
                schema=STANDARD_ERROR_SCHEMAS['permission_error'],
                examples={
                    "application/json": {
                        "attendance_access_denied": {
                            "error": "Attendance data access denied",
                            "detail": "You do not have permission to view attendance data for this report.",
                            "code": "attendance_data_access_denied"
                        },
                        "not_event_stakeholder": {
                            "error": "Not event stakeholder",
                            "detail": "You can only view attendance data for events you created, reports you submitted, or events in your club.",
                            "code": "not_event_stakeholder_attendance"
                        }
                    }
                }
            )
            
            error_responses[404] = openapi.Response(
                description="Report or attendance data not found",
                schema=STANDARD_ERROR_SCHEMAS['server_error'],
                examples={
                    "application/json": {
                        "no_attendance_data": {
                            "error": "No attendance data",
                            "detail": "No attendance data is available for this event report.",
                            "code": "no_attendance_data"
                        },
                        "report_not_found": {
                            "error": "Report not found",
                            "detail": "The specified event report does not exist.",
                            "code": "event_report_not_found"
                        }
                    }
                }
            )
        
        return error_responses
    
    
    def has_permission(self, request, view):
        user = request.user
        action =  getattr(view, 'action', None)
        role = self.get_user_role(user)
        
        logger.info(f"=== [EventReportPermission] has_permission called ===")
        logger.info(f"[EventReportPermission] User: {request.user}")
        logger.info(f"[EventReportPermission] Is authenticated: {request.user.is_authenticated}")
        
        if not user.is_authenticated:
            logger.error(f"[EventReportPermission] DENIED: User not authenticated")
            return False
        
        logger.info(f"[EventReportPermission] Action: {action}")
        logger.info(f"[EventReportPermission] User role: {role}")
        logger.info(f"[EventReportPermission] User is_staff: {user.is_staff}")
        logger.info(f"[EventReportPermission] User is_superuser: {user.is_superuser}")
        
        if action in ['list', 'retrieve', 'pending_reports', 'get_attendance_data']:
            logger.info(f"[EventReportPermission] ALLOWED: Action '{action}' is a read action")
            if user.is_staff or user.is_superuser:
                return True
            if role == 'volunteer':
                return True
            
            return False

        if action == 'create':
            logger.info(f"[EventReportPermission] Checking CREATE permission")
            if role == 'volunteer':
                logger.info(f"[EventReportPermission] ALLOWED: User is volunteer")
                return True
            # Superadmins can also create (for administrative purposes)
            if user.is_staff or user.is_superuser or role == 'superadmin':
                logger.info(f"[EventReportPermission] ALLOWED: User is staff/superuser/superadmin")
                return True
            
            logger.error(f"[EventReportPermission] DENIED: User role '{role}' cannot create reports")
            return False
        
        if action in ['update', 'partial_update', 'destroy']:
            logger.info(f"[EventReportPermission] ALLOWED: Will check object-level permission for '{action}'")
            return True  # Will check has_object_permission
        
        logger.info(f"[EventReportPermission] ALLOWED: Default permission granted")
        return True
    
    def has_object_permission(self, request, view, obj):
        logger.info(f"=== [EventReportPermission] has_object_permission called ===")
        
        user = request.user
        role = self.get_user_role(user)
        action = getattr(view, 'action', None)
        event = obj.event
        
        logger.info(f"[EventReportPermission] User: {user}")
        logger.info(f"[EventReportPermission] User role: {role}")
        logger.info(f"[EventReportPermission] Action: {action}")
        logger.info(f"[EventReportPermission] Report ID: {obj.id}")
        logger.info(f"[EventReportPermission] Event: {event.title} (ID: {event.id})")
        logger.info(f"[EventReportPermission] Report submitted by: {obj.submitted_by}")
        logger.info(f"[EventReportPermission] Event created by: {event.created_by}")
        logger.info(f"[EventReportPermission] Event club: {event.club}")
        
        if user.is_staff or user.is_superuser:
            logger.info(f"[EventReportPermission] ALLOWED: User is staff/superuser/superadmin")
            return True
        
        if action in ['retrieve', 'get_attendance_data']:
            logger.info(f"[EventReportPermission] Checking retrieve/attendance permission")
            # Event creator can view
            if event.created_by == user:
                logger.info(f"[EventReportPermission] ALLOWED: User is event creator")
                return True
            # Report submitter can view
            if obj.submitted_by == user:
                logger.info(f"[EventReportPermission] ALLOWED: User is report submitter")
                return True
            # Volunteers from same club can view
            if role == 'volunteer' and hasattr(user, 'club') and user.club:
                logger.info(f"[EventReportPermission] User club: {user.club}")
                if user.club == event.club:
                    logger.info(f"[EventReportPermission] ALLOWED: Volunteer from same club")
                    return True
                else:
                    logger.error(f"[EventReportPermission] DENIED: Volunteer from different club")
            else:
                logger.info(f"[EventReportPermission] User has no club or is not volunteer")
            
            logger.error(f"[EventReportPermission] DENIED: No matching retrieve permission")
            return False
        
        # For update/delete - only the volunteer who submitted can edit/delete
        if action in ['update', 'partial_update', 'destroy']:
            logger.info(f"[EventReportPermission] Checking update/delete permission")
            
            # Only the submitter (volunteer) can update/delete their own report
            if obj.submitted_by == user and role == 'volunteer':
                logger.info(f"[EventReportPermission] ALLOWED: User is submitter and volunteer")
                return True
            
            if obj.submitted_by != user:
                logger.error(f"[EventReportPermission] DENIED: User is not the report submitter")
            if role != 'volunteer':
                logger.error(f"[EventReportPermission] DENIED: User role is '{role}', not volunteer")
            
            return False
        
        logger.error(f"[EventReportPermission] DENIED: No matching action permission")
        return False
        
        
        