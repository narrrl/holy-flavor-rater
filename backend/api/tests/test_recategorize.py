from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from api.models import Category, Flavor, Rating, User


def _product(pid, title, product_type="", tags=None):
    return {"id": pid, "title": title, "product_type": product_type, "tags": tags or []}


class RecategorizeTests(TestCase):
    def setUp(self) -> None:
        self.packs = Category.objects.create(name="Packs and other", slug="packs-and-other")
        self.energy = Category.objects.create(name="Energy", slug="energy")

    def _run(self, products, **opts):
        with patch(
            "api.management.commands.recategorize_flavors.Command.fetch_products",
            return_value=products,
        ):
            call_command("recategorize_flavors", **opts)

    def test_dry_run_does_not_move(self) -> None:
        # Mis-shelved: a real syrup product currently parked in packs.
        flavor = Flavor.objects.create(name="Reinigungsbürste", category=self.packs, external_id=42)
        self._run([_product(42, "Reinigungsbürste", "42 - Syrup Bottle")])
        flavor.refresh_from_db()
        self.assertEqual(flavor.category_id, self.packs.id)
        self.assertFalse(Category.objects.filter(slug="syrup").exists())

    def test_apply_moves_and_creates_category(self) -> None:
        flavor = Flavor.objects.create(name="Reinigungsbürste", category=self.packs, external_id=42)
        self._run([_product(42, "Reinigungsbürste", "42 - Syrup Bottle")], apply=True)
        flavor.refresh_from_db()
        self.assertEqual(flavor.category.slug, "syrup")

    def test_unchanged_row_stays(self) -> None:
        flavor = Flavor.objects.create(name="Mojito Macaw", category=self.energy, external_id=1)
        self._run([_product(1, "Mojito Macaw", "01 - Energy Bundle")], apply=True)
        flavor.refresh_from_db()
        self.assertEqual(flavor.category_id, self.energy.id)

    def test_row_not_in_catalog_is_skipped(self) -> None:
        flavor = Flavor.objects.create(name="Gone", category=self.packs, external_id=999)
        self._run([_product(1, "Mojito Macaw", "01 - Energy Bundle")], apply=True)
        flavor.refresh_from_db()
        self.assertEqual(flavor.category_id, self.packs.id)

    def test_collision_skipped_without_flag(self) -> None:
        syrup = Category.objects.create(name="Syrup", slug="syrup")
        # Target already holds a row of the same name.
        Flavor.objects.create(name="Dup", category=syrup, external_id=100)
        moving = Flavor.objects.create(name="Dup", category=self.packs, external_id=42)
        self._run([_product(42, "Dup", "42 - Syrup Bottle")], apply=True)
        moving.refresh_from_db()
        self.assertEqual(moving.category_id, self.packs.id)  # untouched
        self.assertEqual(Flavor.objects.filter(name="Dup").count(), 2)

    def test_collision_merges_with_flag(self) -> None:
        user = User.objects.create_user(username="u", password="p")
        syrup = Category.objects.create(name="Syrup", slug="syrup")
        keep = Flavor.objects.create(name="Dup", category=syrup, external_id=100)
        moving = Flavor.objects.create(name="Dup", category=self.packs, external_id=42)
        Rating.objects.create(user=user, flavor=moving, score=5)
        self._run([_product(42, "Dup", "42 - Syrup Bottle")], apply=True, merge_collisions=True)
        self.assertFalse(Flavor.objects.filter(pk=moving.pk).exists())
        self.assertTrue(Rating.objects.filter(flavor=keep, user=user).exists())
