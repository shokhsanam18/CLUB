from django.urls import path, include
from .views import RegisterView, LoginView, UserProfileDetailView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('auth/', include('djoser.urls.jwt')),
    path('accounts/<int:user_id>', UserProfileDetailView.as_view(), name='user-profile-detail'),
]