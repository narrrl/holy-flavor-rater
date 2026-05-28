import requests
from django.core.management.base import BaseCommand
from django.db import transaction

from api.management.commands.sync_flavors import Command as SyncCommand
from api.models import Category, Flavor
from api.services.flavor import merge_flavors

_CATALOG_URL = "https://weareholy.com/products.json?limit=250"
_PACKS_SLUG = "packs-and-other"
_PACKS_NAME = "Packs and other"


class Command(BaseCommand):
    help = (
        "Re-evaluate the category of every already-synced flavor against the current "
        "sync_flavors logic and move mis-shelved rows. Dry-run unless --apply is given. "
        "Existing flavors keep their creation-time category during normal sync, so this "
        "is the way to retro-apply categorization changes to rows that already exist."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist changes. Without this flag the command only reports what would change.",
        )
        parser.add_argument(
            "--merge-collisions",
            action="store_true",
            help=(
                "If the target category already holds a flavor with the same name, merge "
                "this row into it (preserves ratings) instead of skipping. Implies a write; "
                "only acts under --apply."
            ),
        )

    def fetch_products(self) -> list[dict]:
        response = requests.get(_CATALOG_URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
        response.raise_for_status()
        return response.json().get("products", [])

    def handle(self, *args, **options):
        apply = options["apply"]
        merge_collisions = options["merge_collisions"]

        try:
            products = self.fetch_products()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to fetch catalog: {e}"))
            return

        by_id = {p["id"]: p for p in products if p.get("id") is not None}
        self.stdout.write(f"Fetched {len(by_id)} catalog products.")

        sync = SyncCommand()
        moved = merged = collisions = unresolved = not_in_catalog = unchanged = 0

        # Everything mutating runs in one transaction. resolve_category auto-creates
        # categories as a side effect, so dry-run rolls the whole thing back to stay pure.
        with transaction.atomic():
            packs_category = Category.objects.get_or_create(
                slug=_PACKS_SLUG, defaults={"name": _PACKS_NAME}
            )[0]
            moved, merged, collisions, unresolved, not_in_catalog, unchanged = self._process(
                by_id, sync, packs_category, apply, merge_collisions
            )
            if not apply:
                transaction.set_rollback(True)

        verb = "Applied" if apply else "Would change (dry-run)"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb}: moved={moved}, merged={merged}, collisions={collisions}, "
                f"unresolved={unresolved}, unchanged={unchanged}, not_in_catalog={not_in_catalog}"
            )
        )
        if not apply and (moved or collisions):
            self.stdout.write("Re-run with --apply to persist.")

    def _process(self, by_id, sync, packs_category, apply, merge_collisions):
        moved = merged = collisions = unresolved = not_in_catalog = unchanged = 0

        for flavor in Flavor.objects.filter(external_id__isnull=False).select_related("category"):
            product = by_id.get(flavor.external_id)
            if product is None:
                not_in_catalog += 1
                continue

            title = product.get("title", "").strip()
            tags = product.get("tags", [])
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",")]
            tags_lower = [t.lower() for t in tags]

            target = sync.resolve_category(product, title.lower(), tags_lower, packs_category)

            if target is None:
                unresolved += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  ? {flavor.name!r} [{flavor.category.slug}]: resolver yields no "
                        f"category (product_type={product.get('product_type')!r}) — left as-is"
                    )
                )
                continue

            if target.id == flavor.category_id:
                unchanged += 1
                continue

            conflict = (
                Flavor.objects.filter(name=flavor.name, category=target)
                .exclude(pk=flavor.pk)
                .first()
            )
            if conflict is not None:
                collisions += 1
                if merge_collisions:
                    self.stdout.write(
                        f"  MERGE {flavor.name!r}: {flavor.category.slug} -> {target.slug} "
                        f"(into existing row #{conflict.pk})"
                    )
                    if apply:
                        merge_flavors(conflict, flavor)
                        merged += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  SKIP {flavor.name!r}: target {target.slug} already has a flavor "
                            f"named {flavor.name!r} (#{conflict.pk}). Re-run with "
                            f"--merge-collisions to fold them."
                        )
                    )
                continue

            self.stdout.write(f"  MOVE {flavor.name!r}: {flavor.category.slug} -> {target.slug}")
            if apply:
                flavor.category = target
                flavor.save(update_fields=["category"])
            moved += 1

        return moved, merged, collisions, unresolved, not_in_catalog, unchanged
