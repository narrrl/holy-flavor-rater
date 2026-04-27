import os

from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from django.views.generic.base import TemplateView
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenVerifyView

from api.views.auth import CookieLogoutView, CookieTokenObtainPairView, CookieTokenRefreshView


def health_check(request):
    return HttpResponse("OK", content_type="text/plain")


# Clean the admin path
admin_url = os.environ.get("ADMIN_URL", "admin").strip("/")

urlpatterns = [
    # Health check
    path("health/", health_check, name="health_check"),
    # Robots.txt
    path("robots.txt", TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),
    # Ensure admin ends with a slash for Django's redirection logic
    path(f"{admin_url}/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/auth/token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("api/auth/logout/", CookieLogoutView.as_view(), name="auth_logout"),
    # Legacy alias: old DRF TokenAuth endpoint now sets cookies just like the
    # canonical login route so clients relying on POST /api/token/ keep working.
    path("api/token/", CookieTokenObtainPairView.as_view(), name="api_token_legacy"),
    path("api-auth/", include("rest_framework.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("media/<path:path>", serve, {"document_root": settings.MEDIA_ROOT}),
]
