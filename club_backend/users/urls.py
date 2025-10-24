from django.urls import path, include
from .views import (RegisterView, LoginView, UserProfileDetailView, 
                    PasswordResetConfirmView, PasswordResetRequestView)
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'accounts', UserProfileDetailView, basename='user-account')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('reset/', PasswordResetRequestView.as_view(), name='reset-password'),
    path('reset-confirm/<str:uidb64/<str:token>/', PasswordResetConfirmView.as_view(), name='reset-password-confirm'),
    path('auth/', include('djoser.urls.jwt')),
    path('', include(router.urls)),
]