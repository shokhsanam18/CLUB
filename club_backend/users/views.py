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
    Alternative implementation using SimpleJWT built-in utilities
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'user_id'
    
    def get_queryset(self):
        return CustomUser.objects.select_related('club').all()
    
    def get_token_user_id(self, request):
        """
        Extract user_id from raw JWT token without hitting DB
        """
        try:
            # Get raw JWT string from Authorization header
            auth_header = request.META.get("HTTP_AUTHORIZATION", "")
            prefix = "Bearer "
            if auth_header.startswith(prefix):
                raw_token = auth_header[len(prefix):]
            else:
                return None

            # Decode and validate token
            validated_token = UntypedToken(raw_token)
            return int(validated_token.payload.get("user_id"))

        except (InvalidToken, TokenError):
            return None
    
    def get_object(self):
        user_id = self.kwargs.get('user_id')
        
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            raise NotFound("Invalid user ID")
        
        return get_object_or_404(self.get_queryset(), id=user_id)
    
    def get(self, request, *args, **kwargs):
        """Handle GET request with token user_id validation"""
        user_obj = self.get_object()
        target_user_id = user_obj.id
        token_user_id = self.get_token_user_id(request)
        
        # Check if user can view this profile
        if not user_obj.is_profile_public:
            if not token_user_id or token_user_id != target_user_id:
                return Response(
                    {"error": "You can only view your own private profile."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = self.get_serializer(user_obj)
        return Response(serializer.data)
    
    def patch(self, request, *args, **kwargs):
        """Handle PATCH request with strict token validation"""
        user_obj = self.get_object()
        target_user_id = user_obj.id
        token_user_id = self.get_token_user_id(request)
        
        # Strict validation: token user_id must match target user_id
        if not token_user_id or token_user_id != target_user_id:
            return Response(
                {
                    "error": "Access denied. JWT token doesn't authorize editing this profile.",
                    "token_user_id": token_user_id,
                    "requested_user_id": target_user_id
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        return self.partial_update(request, *args, **kwargs)