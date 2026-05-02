"""httpOnly-cookie JWT auth.

Reads `access_token` from a cookie set by the login/refresh endpoints. Falls
back to the Authorization header for backwards compatibility during rollout —
strip the fallback once all clients use cookies.
"""

from __future__ import annotations

from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE_ACCESS)
        if raw_token is None:
            return super().authenticate(request)
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token


class CookieJWTScheme(OpenApiAuthenticationExtension):
    """Make drf-spectacular treat CookieJWTAuthentication like the SimpleJWT scheme."""

    target_class = "api.utils.cookie_auth.CookieJWTAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):  # type: ignore[no-untyped-def]
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": settings.JWT_AUTH_COOKIE_ACCESS,
        }


def set_jwt_cookies(response, access: str | None, refresh: str | None) -> None:
    """Attach access/refresh tokens to the response as httpOnly cookies."""
    from datetime import timedelta

    secure = settings.JWT_AUTH_COOKIE_SECURE
    samesite = settings.JWT_AUTH_COOKIE_SAMESITE
    path = settings.JWT_AUTH_COOKIE_PATH

    if access:
        access_lifetime: timedelta = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
        response.set_cookie(
            settings.JWT_AUTH_COOKIE_ACCESS,
            access,
            max_age=int(access_lifetime.total_seconds()),
            httponly=True,
            secure=secure,
            samesite=samesite,
            path=path,
        )
    if refresh:
        refresh_lifetime: timedelta = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
        response.set_cookie(
            settings.JWT_AUTH_COOKIE_REFRESH,
            refresh,
            max_age=int(refresh_lifetime.total_seconds()),
            httponly=True,
            secure=secure,
            samesite=samesite,
            path=path,
        )


def clear_jwt_cookies(response) -> None:
    response.delete_cookie(settings.JWT_AUTH_COOKIE_ACCESS, path=settings.JWT_AUTH_COOKIE_PATH)
    response.delete_cookie(settings.JWT_AUTH_COOKIE_REFRESH, path=settings.JWT_AUTH_COOKIE_PATH)
