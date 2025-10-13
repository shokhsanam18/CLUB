from rest_framework.routers import DefaultRouter
from .views import ClubViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r'clubs', ClubViewSet, basename='club')
router.register(r'notifications', NotificationViewSet, basename='notifications')

urlpatterns = router.urls
