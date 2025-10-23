from django.http import Http404
from django.shortcuts import render, get_object_or_404
from django.db import transaction
from django.contrib.auth.models import Group
from django.core.mail import send_mail
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.conf import settings

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from rest_framework import viewsets, status, views, generics, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.exceptions import NotFound

from rest_framework_simplejwt.tokens import RefreshToken


from .models import CustomUser
from .serializers import (UserDetailSerializer, UserLoginSerializer,
                          UserProfileSerializer, UserRegistrationSerializer,
                          UserRoleManagementSerializer, UserSearchSerializer,
                          PasswordResetSerializer)
from .permissions import UserProfilePermission

from clubs.views import error_response, paginated_response

import logging

logger = logging.getLogger(__name__)

def send_reset_mail(user, request):
    token_gen = PasswordResetTokenGenerator()
    token = token_gen.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    reset_link = f"http://itcomclubs.uz/reset-confirm/{uid}/{token}/"
    
    send_mail(
        'Password Reset',
        f"Click here to reset your password: {reset_link}",
        settings.DEFAULT_FROM_EMAIL,
        [user.email]
    )



# Create your views here.
class RegisterView(views.APIView):
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="Get registration form schema",
        operation_description="Returns the required and optional fields for user registration",
        responses={
            200: openapi.Response(
                description="Registration form schema",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'required_fields': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(type=openapi.TYPE_STRING)
                        ),
                        'optional_fields': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(type=openapi.TYPE_STRING)
                        ),
                    }
                )
            )
        },
        tags=['authentication']
    )
    def get(self, request):
        """Show registration form schema (for testing)"""
        return Response({
            'message': 'Registration endpoint',
            'required_fields': ['email', 'first_name', 'last_name', 'tg_id',
                                'password', 'password_confirm'],
            'optional_fields': ['university', 'bio']
        })
    
    @swagger_auto_schema(
        operation_summary="Register new user",
        operation_description="Create a new user account and return JWT tokens",
        request_body=UserRegistrationSerializer,  # Using your actual serializer
        responses={
            201: openapi.Response(
                description="Registration successful",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'user': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'email': openapi.Schema(type=openapi.TYPE_STRING),
                                'first_name': openapi.Schema(type=openapi.TYPE_STRING),
                                'last_name': openapi.Schema(type=openapi.TYPE_STRING),
                                'university': openapi.Schema(type=openapi.TYPE_STRING),
                            }
                        ),
                        'tokens': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'access': openapi.Schema(type=openapi.TYPE_STRING),
                                'refresh': openapi.Schema(type=openapi.TYPE_STRING),
                            }
                        )
                    }
                )
            ),
            400: openapi.Response(
                description="Validation errors",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    additional_properties=openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(type=openapi.TYPE_STRING)
                    )
                )
            )
        },
        tags=['authentication']
    )
    def post(self, request):
        """User registration endpoint"""
        logger.info(f"Register POST request received: {request.data}")
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            return Response({
                'message': 'Registration successful',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'university': user.university,
                },
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(views.APIView):
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="User login",
        operation_description="Authenticate user and return JWT tokens",
        request_body=UserLoginSerializer,  # Using your actual serializer
        responses={
            200: openapi.Response(
                description="Login successful",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'user': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'email': openapi.Schema(type=openapi.TYPE_STRING),
                                'first_name': openapi.Schema(type=openapi.TYPE_STRING),
                                'last_name': openapi.Schema(type=openapi.TYPE_STRING),
                                'university': openapi.Schema(type=openapi.TYPE_STRING),
                                'role': openapi.Schema(type=openapi.TYPE_STRING, nullable=True),
                            }
                        ),
                        'tokens': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'access': openapi.Schema(type=openapi.TYPE_STRING),
                                'refresh': openapi.Schema(type=openapi.TYPE_STRING),
                            }
                        )
                    }
                )
            ),
            400: openapi.Response(
                description="Invalid credentials",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    additional_properties=openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(type=openapi.TYPE_STRING)
                    )
                )
            )
        },
        tags=['authentication']
    )
    def post(self, request):
        """User login endpoint"""
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            user = CustomUser.objects.prefetch_related('groups').get(pk=user.pk)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            return Response({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'university': user.university,
                    'role': getattr(user, 'role', None),
                },
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileDetailView(mixins.RetrieveModelMixin,
                            mixins.UpdateModelMixin,
                            viewsets.GenericViewSet):
    """
    User profile detail view with hybrid permission system
    
    GET /accounts/<user_id>/ - Retrieve user profile
    PATCH /accounts/<user_id>/ - Update user profile
    POST /accounts/<user_id>/assign-role/ - Assign role to user
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, UserProfilePermission]
    lookup_field = 'id'
    lookup_url_kwarg = 'user_id'
    
    def get_queryset(self):
        """Optimize queryset with related data"""
        return CustomUser.objects.prefetch_related('groups', 'club')
    
    def get_object(self):
        """Get the user object with proper error handling"""
        user_id = self.kwargs.get('user_id')
        
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            raise NotFound("Invalid user ID")
        
        try:
            return get_object_or_404(self.get_queryset(), id=user_id)
        except Http404:
            raise NotFound("User not found")
        
    @swagger_auto_schema(
        operation_summary="Get user profile",
        operation_description="Retrieve user profile information (requires authentication and appropriate permissions)",
        responses={
            200: UserProfileSerializer,  # Using your actual serializer
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="User not found", schema=error_response)
        },
        tags=['users']
    )
    def retrieve(self, request, *args, **kwargs):
        """
        Handle GET request - retrieve user profile
        Permissions are handled by UserProfilePermission.has_object_permission
        """
        user_obj = self.get_object()
        
        self.check_object_permissions(request, user_obj)
        
        serializer = self.get_serializer(user_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    
    @swagger_auto_schema(
        operation_summary="Update user profile",
        operation_description="Update user profile information (requires authentication and appropriate permissions)",
        request_body=UserProfileSerializer,  # Using your actual serializer
        responses={
            200: UserProfileSerializer,  # Return updated profile
            400: openapi.Response(description="Validation error", schema=error_response),
            403: openapi.Response(description="Permission denied", schema=error_response),
            404: openapi.Response(description="User not found", schema=error_response)
        },
        tags=['users']
    )
    def partial_update(self, request, *args, **kwargs):
        """
        Handle PATCH request - update user profile
        Permissions are handled by UserProfilePermission.has_object_permission
        """
        user_obj = self.get_object()
        
        # Check object-level permission (this calls your hybrid permission system)
        self.check_object_permissions(request, user_obj)
        
        # Perform the update
        serializer = self.get_serializer(user_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='assign-role')
    @swagger_auto_schema(
    operation_summary="Assign role to user",
    operation_description="Assign a specific role (group) to a user (Vice-Ambassadors and higher)",
    request_body=UserRoleManagementSerializer,
    responses={
        200: openapi.Response(
            description="Role assigned successfully",
            examples={
                "application/json": {
                    "message": "Role 'Volunteer' assigned successfully",
                    "user_id": 123,
                    "role": "Volunteer"
                }
            }
        ),
        400: openapi.Response(
            description="Bad Request - Validation errors",
            examples={
                "application/json": {
                    "role": ["You do not have permission to assign the 'Ambassador' role. You can only assign: Volunteer"]
                }
            }
        ),
        403: openapi.Response(
            description="Permission denied - User lacks assign_volunteers permission",
            examples={
                "application/json": {
                    "detail": "You do not have permission to perform this action."
                }
            }
        ),
        404: openapi.Response(
            description="User not found",
            examples={
                "application/json": {
                    "detail": "User not found"
                }
            }
        )
    },
    tags=['users']
    )
    def assign_role(self, request, user_id=None):
        """Assign role (Volunteer, etc.) to a user"""
        user_obj = self.get_object()

        

        serializer = UserRoleManagementSerializer(data=request.data, context={'request' : request})
        if serializer.is_valid():
            
            role_name = serializer.validated_data['role']

            with transaction.atomic():
                role_group = Group.objects.get(name=role_name)
                user_obj.groups.add(role_group)

                logger.info(f"Role '{role_name}' assigned to user {user_obj.id} by {request.user.id}")

                return Response({
                    "message": f"Role '{role_name}' assigned successfully",
                    "user_id": user_obj.id,
                    "role": role_name
                })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class PasswordResetRequestView(views.APIView):
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="Request password reset email",
        request_body=PasswordResetSerializer,
        responses={
            200: openapi.Response(
                description="Instructions sent if email is registered.",
                examples={"application/json": {"message": "If this email is registered, you will receive password reset instructions."}}
            )
        },
        tags=['authentication']
    )
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data["email"]
        
        try:
            user = CustomUser.objects.get(email=email, is_active=True)
            send_reset_mail(user, request)
        except CustomUser.DoesNotExist:
            pass
        
        return Response({
            "message": "If this email is registered, you will receive password reset instructions."
        })
        
class PasswordResetConfirmView(views.APIView):
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="Confirm password reset via link",
        manual_parameters=[
            openapi.Parameter('uidb64', openapi.IN_PATH, type=openapi.TYPE_STRING, description="User ID in base64"),
            openapi.Parameter('token', openapi.IN_PATH, type=openapi.TYPE_STRING, description="Password reset token"),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={'new_password': openapi.Schema(type=openapi.TYPE_STRING)},
            required=['new_password'],
        ),
        responses={
            200: openapi.Response("Password reset successfully.", examples={"application/json": {"message": "Password has been reset"}}),
            400: openapi.Response("Invalid or expired token.", examples={"application/json": {"message": "Invalid or expired token"}}),
        },
        tags=['authentication']
    )
    def post(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response({"message": "Invalid link"}, status=400)

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, token):
            return Response({"message": "Invalid or expired token"}, status=400)
        
        new_password = request.data.get('new_password')
        user.set_password(new_password)
        user.save()
        
        return Response({"message": "Password has been reset"})