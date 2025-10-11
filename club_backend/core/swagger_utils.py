"""
Swagger/OpenAPI utilities for automatic permission-based error response generation.
"""

import functools
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema


def get_permission_error_responses(viewset_class, action=None):
    """
    Automatically extract error response schemas from permission classes.
    
    Args:
        viewset_class: The ViewSet class to extract permissions from
        action: The specific action name (create, update, etc.)
    
    Returns:
        dict: Dictionary of status codes mapped to OpenAPI response schemas
    """
    permission_classes = getattr(viewset_class, 'permission_classes', [])
    all_error_responses = {}
    
    # Add standard auth error for authenticated-required endpoints
    from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
    
    needs_auth = any(
        issubclass(perm, (IsAuthenticated, IsAuthenticatedOrReadOnly))
        for perm in permission_classes
    )
    
    if needs_auth:
        all_error_responses[401] = openapi.Response(
            description="Authentication required",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'error': openapi.Schema(type=openapi.TYPE_STRING, example="Authentication required"),
                    'detail': openapi.Schema(type=openapi.TYPE_STRING, example="You must be logged in to perform this action."),
                    'code': openapi.Schema(type=openapi.TYPE_STRING, example="authentication_required")
                }
            )
        )
    
    # Extract error responses from each permission class
    for permission_class in permission_classes:
        if hasattr(permission_class, 'get_error_responses'):
            error_responses = permission_class.get_error_responses(action)
            # Merge responses, with later ones taking precedence
            all_error_responses.update(error_responses)
    
    return all_error_responses


def swagger_permission_schema(operation_summary, operation_description=None, **kwargs):
    """
    Custom swagger decorator that automatically includes permission error responses.
    
    Usage:
        @swagger_permission_schema(
            operation_summary="Create a new club",
            operation_description="Create club with permissions",
            responses={
                201: ClubDetailSerializer,  # Add success responses
                # Error responses auto-added from permission classes
            }
        )
        def create(self, request, *args, **kwargs):
            pass
    """
    def decorator(view_method):
        # Get the viewset class and action name at import time
        method_name = view_method.__name__
        
        # Handle custom actions with url_path
        if hasattr(view_method, 'url_path'):
            action_name = view_method.url_path.replace('-', '_')
        else:
            action_name = method_name
        
        @functools.wraps(view_method)  # This is the key fix!
        def wrapper(self, *args, **wrapper_kwargs):
            return view_method(self, *args, **wrapper_kwargs)
        
        # Get viewset class from the method's qualname at definition time
        viewset_class = None
        if hasattr(view_method, '__qualname__'):
            try:
                # Extract class name from qualname (e.g., "ClubViewSet.create" -> "ClubViewSet")
                class_name = view_method.__qualname__.split('.')[0]
                
                # Get the class from the calling frame
                import sys
                frame = sys._getframe(1)
                viewset_class = frame.f_locals.get(class_name)
            except:
                pass
        
        # If we couldn't get the class at definition time, we'll get it at runtime
        if viewset_class and hasattr(viewset_class, 'permission_classes'):
            # Get permission-based error responses
            error_responses = get_permission_error_responses(viewset_class, action_name)
            
            # Merge with any custom responses passed in kwargs
            responses = kwargs.get('responses', {})
            responses.update(error_responses)
            kwargs['responses'] = responses
        
        # Apply the swagger_auto_schema decorator to the wrapper
        decorated_wrapper = swagger_auto_schema(
            operation_summary=operation_summary,
            operation_description=operation_description,
            **kwargs
        )(wrapper)
        
        # Ensure the wrapper has the correct name for DRF
        decorated_wrapper.__name__ = method_name
        decorated_wrapper.__qualname__ = view_method.__qualname__
        
        # Copy any action-related attributes
        if hasattr(view_method, 'detail'):
            decorated_wrapper.detail = view_method.detail
        if hasattr(view_method, 'methods'):
            decorated_wrapper.methods = view_method.methods
        if hasattr(view_method, 'url_path'):
            decorated_wrapper.url_path = view_method.url_path
        if hasattr(view_method, 'url_name'):
            decorated_wrapper.url_name = view_method.url_name
        
        return decorated_wrapper
    
    return decorator


# Standard error response schemas for reuse
STANDARD_ERROR_SCHEMAS = {
    'auth_error': openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'error': openapi.Schema(type=openapi.TYPE_STRING, example="Authentication required"),
            'detail': openapi.Schema(type=openapi.TYPE_STRING, example="You must be logged in to perform this action."),
            'code': openapi.Schema(type=openapi.TYPE_STRING, example="authentication_required")
        },
        title="Authentication required error response"
    ),
    
    'permission_error': openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'error': openapi.Schema(type=openapi.TYPE_STRING, example="Permission denied"),
            'detail': openapi.Schema(type=openapi.TYPE_STRING, example="You don't have permission to perform this action."),
            'code': openapi.Schema(type=openapi.TYPE_STRING, example="permission_denied"),
            'user_role': openapi.Schema(type=openapi.TYPE_STRING, example="volunteer", description="Current user role")
        },
        title="Permission denied error response"
    ),
    
    'validation_error': openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'error': openapi.Schema(type=openapi.TYPE_STRING, example="Validation error"),
            'detail': openapi.Schema(type=openapi.TYPE_STRING, example="You are already a member of another club."),
            'code': openapi.Schema(type=openapi.TYPE_STRING, example="already_club_member"),
            'current_club': openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'name': openapi.Schema(type=openapi.TYPE_STRING)
                }
            )
        },
        title="Business validation error response"
    ),
    
    'server_error': openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'error': openapi.Schema(type=openapi.TYPE_STRING, example="Server error"),
            'detail': openapi.Schema(type=openapi.TYPE_STRING, example="An unexpected error occurred."),
            'code': openapi.Schema(type=openapi.TYPE_STRING, example="internal_server_error")
        },
        title="Server error response"
    )
}


def create_standard_error_responses():
    """Create standard error response dict for swagger schemas."""
    return {
        400: openapi.Response("Validation error", schema=STANDARD_ERROR_SCHEMAS['validation_error']),
        401: openapi.Response("Authentication required", schema=STANDARD_ERROR_SCHEMAS['auth_error']),
        403: openapi.Response("Permission denied", schema=STANDARD_ERROR_SCHEMAS['permission_error']),
        404: openapi.Response("Resource not found", schema=STANDARD_ERROR_SCHEMAS['server_error']),
        500: openapi.Response("Server error", schema=STANDARD_ERROR_SCHEMAS['server_error'])
    }
