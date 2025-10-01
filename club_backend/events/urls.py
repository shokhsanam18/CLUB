from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

router.register(r'events', views.EventViewSet, basename='event')
router.register(r'registrations', views.EventRegistrationViewSet, basename='eventregistration')
router.register(r'reports', views.EventReportViewSet, basename='eventreport')
router.register(r'dashboard', views.EventDashboardViewSet, basename='eventdashboard')

urlpatterns = router.urls
