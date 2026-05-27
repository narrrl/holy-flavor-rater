import re

from django.core.management.base import BaseCommand

from api.models import Category, Flavor
from api.services.flavor import merge_flavors

SUFFIXES = [
    r"\s+Energy$",
    r"\s+Hydration$",
    r"\s+Iced\s+Tea$",
    r"\s+\(Legacy\)$",
]


class Command(BaseCommand):
    help = "Identifies and merges duplicate flavors (normalized name and category)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report merges without performing them.",
        )
        parser.add_argument(
            "--no-normalize",
            action="store_true",
            help="Match exact names only; do not strip suffixes like ' Energy'.",
        )

    def normalize_name(self, name: str, strip_suffixes: bool = True) -> str:
        """Lowercase, trim, and (optionally) strip common product suffixes."""
        norm = name.strip()
        if strip_suffixes:
            for suffix in SUFFIXES:
                norm = re.sub(suffix, "", norm, flags=re.IGNORECASE)
        return norm.strip().lower()

    def handle(self, *args, **options):
        dry_run: bool = options.get("dry_run", False)
        strip_suffixes: bool = not options.get("no_normalize", False)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be made."))

        total_merged = 0

        for category in Category.objects.all():
            grouped: dict[str, list[Flavor]] = {}
            for f in Flavor.objects.filter(category=category):
                grouped.setdefault(self.normalize_name(f.name, strip_suffixes), []).append(f)

            for flavor_set in grouped.values():
                if len(flavor_set) <= 1:
                    continue

                # Keep the catalog row (has external_id) and the oldest on ties.
                flavor_set.sort(key=lambda x: (x.external_id is None, x.created_at))
                keep, others = flavor_set[0], flavor_set[1:]

                names = ", ".join(f"'{o.name}' (ID {o.id})" for o in others)
                self.stdout.write(
                    f"{'[dry-run] would merge' if dry_run else 'Merging'} {names} "
                    f"into '{keep.name}' (Category: {category.name}, ID: {keep.id})"
                )

                if not dry_run:
                    for other in others:
                        merge_flavors(keep, other)
                total_merged += len(others)

        verb = "Would merge" if dry_run else "Finished cleaning up"
        self.stdout.write(self.style.SUCCESS(f"{verb} {total_merged} duplicates."))
