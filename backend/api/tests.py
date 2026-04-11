from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Category, Flavor, User, Rating

class FlavorTopTests(APITestCase):
    def setUp(self):
        self.category_energy = Category.objects.create(name='Energy', slug='energy')
        self.category_iced_tea = Category.objects.create(name='Iced Tea', slug='iced-tea')
        
        self.user = User.objects.create_user(username='testuser', password='password')
        
        # Create flavors
        self.flavor1 = Flavor.objects.create(name='Energy 1', category=self.category_energy)
        self.flavor2 = Flavor.objects.create(name='Iced Tea 1', category=self.category_iced_tea)
        
        # Add ratings to make them appear in top (since we filter by ratings__isnull=False)
        Rating.objects.create(user=self.user, flavor=self.flavor1, score=5)
        Rating.objects.create(user=self.user, flavor=self.flavor2, score=4)

    def test_top_flavors_all(self):
        url = reverse('flavor-top')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_top_flavors_filtered_energy(self):
        url = reverse('flavor-top')
        response = self.client.get(url, {'category': 'energy'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Energy 1')

    def test_top_flavors_filtered_iced_tea(self):
        url = reverse('flavor-top')
        response = self.client.get(url, {'category': 'iced-tea'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Iced Tea 1')

    def test_top_flavors_filtered_non_existent(self):
        url = reverse('flavor-top')
        response = self.client.get(url, {'category': 'non-existent'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
