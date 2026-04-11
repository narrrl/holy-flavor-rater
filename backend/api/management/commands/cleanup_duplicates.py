from django.core.management.base import BaseCommand
from django.db.models import Count

from api.models import Flavor, Rating


class Command(BaseCommand):
    help = "Identifies and merges duplicate flavors (same name and category)"

    def handle(self, *args, **options):
        # Find duplicates based on name and category
        duplicates = (
            Flavor.objects.values("name", "category")
            .annotate(name_count=Count("id"))
            .filter(name_count__gt=1)
        )

        self.stdout.write(f"Found {duplicates.count()} sets of duplicates.")

        for dup in duplicates:
            name = dup["name"]
            category_id = dup["category"]

            # Get all flavors in this set, ordered by having an external_id first, then by date
            flavor_set = Flavor.objects.filter(name=name, category_id=category_id).order_by(
                "-external_id", "created_at"
            )

            # Keep the first one, merge others into it
            keep = flavor_set[0]
            others = flavor_set[1:]

            self.stdout.write(
                f"Merging {len(others)} duplicates into '{keep.name}' (ID: {keep.id}, Ext: {keep.external_id})"
            )

            for other in others:
                # Re-assign ratings
                for rating in Rating.objects.filter(flavor=other):
                    try:
                        rating.flavor = keep
                        rating.save()
                    except Exception:
                        # User already has a rating for the 'keep' flavor
                        # Delete the duplicate rating instead
                        rating.delete()

                # Delete the duplicate flavor
                other.delete()

        self.stdout.write(self.style.SUCCESS("Finished cleaning up duplicates."))
