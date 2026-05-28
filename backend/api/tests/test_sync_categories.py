from django.test import TestCase

from api.management.commands.sync_flavors import Command, _family_from_product_type
from api.models import Category


class FamilyFromProductTypeTests(TestCase):
    def test_strips_prefix_and_form_word(self) -> None:
        self.assertEqual(_family_from_product_type("42 - Syrup Bottle"), "Syrup")
        self.assertEqual(_family_from_product_type("01 - Energy Bundle"), "Energy")
        self.assertEqual(_family_from_product_type("04 - Energy Sachet"), "Energy")

    def test_multiword_family(self) -> None:
        self.assertEqual(_family_from_product_type("02 - Iced Tea Bundle"), "Iced Tea")

    def test_non_flavor_families_return_none(self) -> None:
        for pt in ("10 - Shaker", "11 - Merch", "12 - Value Pack", "16 - Packaging Material"):
            self.assertIsNone(_family_from_product_type(pt), pt)

    def test_empty_or_missing(self) -> None:
        self.assertIsNone(_family_from_product_type(""))
        self.assertIsNone(_family_from_product_type("99 - "))


class ResolveCategoryTests(TestCase):
    def setUp(self) -> None:
        self.cmd = Command()
        self.packs = Category.objects.create(name="Packs and other", slug="packs-and-other")

    def _resolve(self, product, title="", tags=None):
        tags = tags or []
        return self.cmd.resolve_category(product, title.lower(), tags, self.packs)

    def test_new_family_auto_creates_category(self) -> None:
        cat = self._resolve({"product_type": "42 - Syrup Bottle"}, title="Reinigungsbürste")
        self.assertIsNotNone(cat)
        self.assertEqual(cat.slug, "syrup")
        self.assertTrue(Category.objects.filter(slug="syrup").exists())

    def test_known_family_reuses_existing_slug(self) -> None:
        existing = Category.objects.create(name="Iced Tea", slug="iced-tea")
        cat = self._resolve({"product_type": "02 - Iced Tea Bundle"}, title="Erdbeere")
        self.assertEqual(cat.id, existing.id)

    def test_pack_title_keyword_wins_over_family(self) -> None:
        cat = self._resolve({"product_type": "43 - Syrup Bundle"}, title="3er Box Syrup")
        self.assertEqual(cat.id, self.packs.id)

    def test_tag_fallback_when_no_product_type(self) -> None:
        cat = self._resolve({}, title="Mojito Macaw", tags=["holy energy"])
        self.assertEqual(cat.slug, "energy")

    def test_no_signal_returns_none(self) -> None:
        self.assertIsNone(self._resolve({"product_type": "20 - Other Items"}, title="Mystery"))
