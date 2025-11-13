from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import os

@require_http_methods(["GET"])
@csrf_exempt
def frontend_config(request):
    """Provide frontend configuration via API endpoint"""
    config = {
        'API_BASE_URL': os.environ.get('VITE_API_BASE_URL', 'http://localhost:9000'),
        'AUTH_HEADER_PREFIX': os.environ.get('VITE_AUTH_HEADER_PREFIX', 'Bearer'),
        'ENVIRONMENT': os.environ.get('ENVIRONMENT', 'production'),
        'DEBUG': settings.DEBUG,
        'VERSION': getattr(settings, 'APP_VERSION', '1.0.0'),
        'FEATURES': {
            'REGISTRATION_ENABLED': True,
            'SOCIAL_LOGIN': False,  # Configure based on your needs
        }
    }
    
    return JsonResponse(config)

@require_http_methods(["GET"])
def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'version': getattr(settings, 'APP_VERSION', '1.0.0')
    })
