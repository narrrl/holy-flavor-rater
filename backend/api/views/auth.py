"""Cookie-backed JWT auth views.

`CookieTokenObtainPairView` and `CookieTokenRefreshView` move the JWT pair into
httpOnly cookies on the response so the frontend never has tokens in JS-readable
storage. Refresh accepts the token from the cookie *or* the legacy request body.
`CookieLogoutView` clears both cookies and blacklists the refresh token.
"""

from __future__ import annotations

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from api.utils.cookie_auth import clear_jwt_cookies, set_jwt_cookies


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request: Request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.pop("access", None)
            refresh = response.data.pop("refresh", None)
            set_jwt_cookies(response, access, refresh)
            response.data = {"status": "ok"}
        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request: Request, *args, **kwargs):
        if "refresh" not in request.data:
            cookie_refresh = request.COOKIES.get(settings.JWT_AUTH_COOKIE_REFRESH)
            if cookie_refresh:
                # request.data is a QueryDict / dict — make a mutable copy.
                data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
                data["refresh"] = cookie_refresh
                request._full_data = data  # type: ignore[attr-defined]
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.pop("access", None)
            refresh = response.data.pop("refresh", None)
            set_jwt_cookies(response, access, refresh)
            response.data = {"status": "ok"}
        return response


class CookieLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        refresh = request.COOKIES.get(settings.JWT_AUTH_COOKIE_REFRESH)
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        response = Response({"status": "ok"})
        clear_jwt_cookies(response)
        return response
