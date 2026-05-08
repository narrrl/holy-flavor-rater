from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import Category, Flavor, Rating, User


class FlavorTopTests(APITestCase):
    def setUp(self) -> None:
        self.category_energy = Category.objects.create(name="Energy", slug="energy")
        self.category_iced_tea = Category.objects.create(name="Iced Tea", slug="iced-tea")

        self.user = User.objects.create_user(username="testuser", password="password")

        self.flavor1 = Flavor.objects.create(name="Energy 1", category=self.category_energy)
        self.flavor2 = Flavor.objects.create(name="Iced Tea 1", category=self.category_iced_tea)

        Rating.objects.create(user=self.user, flavor=self.flavor1, score=5)
        Rating.objects.create(user=self.user, flavor=self.flavor2, score=4)

    def test_top_flavors_all(self) -> None:
        url = reverse("flavor-top")
        response = self.client.get(url, follow=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_top_flavors_filtered_energy(self) -> None:
        url = reverse("flavor-top")
        response = self.client.get(url, {"category": "energy"}, follow=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Energy 1")

    def test_top_flavors_filtered_iced_tea(self) -> None:
        url = reverse("flavor-top")
        response = self.client.get(url, {"category": "iced-tea"}, follow=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Iced Tea 1")

    def test_top_flavors_filtered_non_existent(self) -> None:
        url = reverse("flavor-top")
        response = self.client.get(url, {"category": "non-existent"}, follow=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
