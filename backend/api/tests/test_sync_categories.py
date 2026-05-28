from unittest.mock import patch

from django.test import TestCase

from api.management.commands.sync_flavors import Command, _family_from_product_type
from api.models import Category, Flavor


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
        cat = self._resolve({"product_type": "42 - Syrup Bottle"}, title="Tropical Punch")
        self.assertIsNotNone(cat)
        self.assertEqual(cat.slug, "syrup")
        self.assertTrue(Category.objects.filter(slug="syrup").exists())

    def test_accessory_title_routes_to_packs(self) -> None:
        # Cleaning brush carries product_type "42 - Syrup Bottle" but is not a drink.
        for title in ("Reinigungsbürste – Syrup Bottle", "Ersatzteile – Syrup Bottle", "Zubehör"):
            cat = self._resolve({"product_type": "42 - Syrup Bottle"}, title=title)
            self.assertEqual(cat.id, self.packs.id, title)

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


class SyrupVariantTests(TestCase):
    def _bundle(self, variants=None):
        return {
            "product_type": "43 - Syrup Bundle",
            "handle": "3er-box-syrup",
            "body_html": "<p>Syrup desc</p>",
            "options": [{"name": "Flavor"}],
            "variants": variants
            or [
                {
                    "id": 111,
                    "option1": "Strawberry",
                    "available": True,
                    "featured_image": {"src": "https://cdn/straw.webp"},
                },
                {
                    "id": 222,
                    "option1": "Mango",
                    "available": False,
                    "featured_image": {"src": "https://cdn/mango.webp"},
                },
            ],
        }

    def test_detects_syrup_bundle(self) -> None:
        self.assertTrue(Command._is_syrup_variant_product(self._bundle()))

    def test_cleaning_brush_not_expanded(self) -> None:
        # Same Syrup family, but no Flavor option and a single variant.
        brush = {
            "product_type": "42 - Syrup Bottle",
            "options": [{"name": "Title"}],
            "variants": [{"id": 1, "option1": "Default Title"}],
        }
        self.assertFalse(Command._is_syrup_variant_product(brush))

    def test_other_lines_with_flavor_option_not_expanded(self) -> None:
        # Energy probe also has a Flavor option, but those flavors are standalone products.
        probe = {
            "product_type": "04 - Energy Sachet",
            "options": [{"name": "Flavor"}],
            "variants": [{"id": 1, "option1": "Mojito Macaw"}, {"id": 2, "option1": "Cherry"}],
        }
        self.assertFalse(Command._is_syrup_variant_product(probe))

    def test_expands_variants_into_individual_flavors(self) -> None:
        synced: list[int] = []
        with patch.object(Command, "download_gallery", return_value=[]):
            created, updated = Command()._sync_syrup_variants(self._bundle(), synced)

        self.assertEqual((created, updated), (2, 0))
        syrup = Category.objects.get(slug="syrup")
        self.assertEqual(
            set(Flavor.objects.filter(category=syrup).values_list("name", flat=True)),
            {"Strawberry", "Mango"},
        )
        straw = Flavor.objects.get(name="Strawberry")
        self.assertEqual(straw.external_id, 111)
        self.assertTrue(straw.is_available)
        self.assertEqual(straw.image_url, "https://cdn/straw.webp")
        self.assertEqual(straw.shop_url, "https://weareholy.com/products/3er-box-syrup")
        self.assertFalse(Flavor.objects.get(name="Mango").is_available)
        self.assertEqual(synced, [111, 222])

    def test_re_sync_updates_not_duplicates(self) -> None:
        with patch.object(Command, "download_gallery", return_value=[]):
            Command()._sync_syrup_variants(self._bundle(), [])
            created, updated = Command()._sync_syrup_variants(self._bundle(), [])
        self.assertEqual((created, updated), (0, 2))
        self.assertEqual(Flavor.objects.filter(category__slug="syrup").count(), 2)
