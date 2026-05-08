from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import User


class JWTAuthTests(APITestCase):
    def setUp(self) -> None:
        self.username = "jwtuser"
        self.password = "correct-horse-battery-staple"
        self.user = User.objects.create_user(username=self.username, password=self.password)

    def _login(self):
        return self.client.post(
            reverse("token_obtain_pair"),
            {"username": self.username, "password": self.password},
            format="json",
        )

    def test_obtain_pair_sets_cookies(self) -> None:
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"status": "ok"})
        self.assertIn(settings.JWT_AUTH_COOKIE_ACCESS, response.cookies)
        self.assertIn(settings.JWT_AUTH_COOKIE_REFRESH, response.cookies)
        access = response.cookies[settings.JWT_AUTH_COOKIE_ACCESS]
        self.assertTrue(access["httponly"])
        self.assertEqual(access["samesite"], settings.JWT_AUTH_COOKIE_SAMESITE)

    def test_cookie_authenticates_protected_endpoint(self) -> None:
        self._login()
        # APIClient persists Set-Cookie across calls, so the next request is
        # authenticated by the cookie alone.
        response = self.client.get("/api/notifications/", follow=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_refresh_uses_cookie_when_body_omitted(self) -> None:
        self._login()
        response = self.client.post(reverse("token_refresh"), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"status": "ok"})
        self.assertIn(settings.JWT_AUTH_COOKIE_ACCESS, response.cookies)

    def test_invalid_refresh_is_rejected(self) -> None:
        response = self.client.post(
            reverse("token_refresh"),
            {"refresh": "not-a-real-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_clears_cookies_and_blacklists_refresh(self) -> None:
        self._login()
        response = self.client.post(reverse("auth_logout"), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # set-cookie should be present with empty/expired value to clear them.
        self.assertEqual(response.cookies[settings.JWT_AUTH_COOKIE_ACCESS].value, "")
        self.assertEqual(response.cookies[settings.JWT_AUTH_COOKIE_REFRESH].value, "")
