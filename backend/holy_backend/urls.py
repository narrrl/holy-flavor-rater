from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.authtoken.views import obtain_auth_token
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.views.generic.base import TemplateView
import os

# Clean the admin path
admin_url = os.environ.get('ADMIN_URL', 'admin').strip('/')

# Catch-all view for React
index_view = TemplateView.as_view(template_name="index.html")

urlpatterns = [
    # Robots.txt
    path('robots.txt', TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),
    
    # Ensure admin ends with a slash for Django's redirection logic
    path(f'{admin_url}/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/token/', obtain_auth_token, name='api_token'),
    path('api-auth/', include('rest_framework.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('media/<path:path>', serve, {'document_root': settings.MEDIA_ROOT}),
    
    # Catch-all for React Frontend
    path('', index_view, name='index'),
    path('<path:resource>', index_view),
]
