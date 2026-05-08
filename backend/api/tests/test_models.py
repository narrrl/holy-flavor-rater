from django.test import TestCase

from api.models import Category, Flavor, Rating, User


class FlavorAverageRatingTests(TestCase):
    def setUp(self) -> None:
        self.category = Category.objects.create(name="Energy", slug="energy")
        self.flavor = Flavor.objects.create(name="Test", category=self.category)
        self.u1 = User.objects.create_user(username="u1", password="x")
        self.u2 = User.objects.create_user(username="u2", password="x")

    def test_average_zero_when_no_ratings(self) -> None:
        self.assertEqual(self.flavor.get_average_rating, 0.0)

    def test_average_uses_aggregate(self) -> None:
        Rating.objects.create(user=self.u1, flavor=self.flavor, score=4)
        Rating.objects.create(user=self.u2, flavor=self.flavor, score=8)
        self.assertEqual(self.flavor.get_average_rating, 6.0)
