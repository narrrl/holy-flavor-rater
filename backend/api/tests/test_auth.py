from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import User


class JWTAuthTests(APITestCase):
    def setUp(self) -> None:
        self.username = "jwtuser"
        self.password = "correct-horse-battery-staple"
        self.user = User.objects.create_user(username=self.username, password=self.password)

    def test_obtain_pair_returns_access_and_refresh(self) -> None:
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url,
            {"username": self.username, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_access_token_authenticates_protected_endpoint(self) -> None:
        pair = self.client.post(
            reverse("token_obtain_pair"),
            {"username": self.username, "password": self.password},
            format="json",
        ).data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {pair['access']}")
        response = self.client.get("/api/notifications/", follow=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_refresh_issues_new_access_token(self) -> None:
        pair = self.client.post(
            reverse("token_obtain_pair"),
            {"username": self.username, "password": self.password},
            format="json",
        ).data
        response = self.client.post(
            reverse("token_refresh"),
            {"refresh": pair["refresh"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_invalid_refresh_is_rejected(self) -> None:
        response = self.client.post(
            reverse("token_refresh"),
            {"refresh": "not-a-real-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
