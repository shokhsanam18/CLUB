from django.urls import path, include
from .views import RegisterView, LoginView, UserProfileDetailView
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'accounts', UserProfileDetailView, basename='user-account')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('auth/', include('djoser.urls.jwt')),
    path('', include(router.urls)),
]