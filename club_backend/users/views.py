from django.http import Http404
from django.shortcuts import render, get_object_or_404

from rest_framework import viewsets, status, views, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.exceptions import NotFound

from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


from .models import CustomUser
from .serializers import (UserDetailSerializer, UserLoginSerializer,
                          UserProfileSerializer, UserRegistrationSerializer,
                          UserRoleManagementSerializer, UserSearchSerializer)
from .permissions import UserProfilePermission

import logging

logger = logging.getLogger(__name__)

# Create your views here.
class RegisterView(views.APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Show registration form schema (for testing)"""
        return Response({
            'message': 'Registration endpoint',
            'required_fields': ['email', 'first_name', 'last_name', 'password', 'password_confirm'],
            'optional_fields': ['university', 'bio']
        })
    
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
    
    def post(self, request):
        """User login endpoint"""
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
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

class UserProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    User profile detail view with hybrid permission system
    
    GET /accounts/<user_id>/ - Retrieve user profile
    PATCH /accounts/<user_id>/ - Update user profile
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, UserProfilePermission]
    lookup_field = 'id'
    lookup_url_kwarg = 'user_id'
    
    def get_queryset(self):
        """Optimize queryset with related data"""
        return CustomUser.objects.select_related('club').all()
    
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
    
    def get(self, request, *args, **kwargs):
        """
        Handle GET request - retrieve user profile
        Permissions are handled by UserProfilePermission.has_object_permission
        """
        user_obj = self.get_object()
        
        # Check object-level permission (this calls your hybrid permission system)
        self.check_object_permissions(request, user_obj)
        
        serializer = self.get_serializer(user_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def patch(self, request, *args, **kwargs):
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