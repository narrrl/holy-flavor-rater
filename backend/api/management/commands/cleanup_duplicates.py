import re
from django.core.management.base import BaseCommand
from django.db.models import Count, F, Func, Value, CharField

from api.models import Flavor, Category
from api.services.flavor import merge_flavors


class Command(BaseCommand):
    help = "Identifies and merges duplicate flavors (normalized name and category)"

    def normalize_name(self, name: str) -> str:
        """Strip common suffixes and normalize for comparison."""
        # Strip common suffixes
        suffixes = [
            r"\s+Energy$",
            r"\s+Hydration$",
            r"\s+Iced\s+Tea$",
            r"\s+\(Legacy\)$",
        ]
        norm = name.strip()
        for suffix in suffixes:
            norm = re.sub(suffix, "", norm, flags=re.IGNORECASE)
        return norm.strip().lower()

    def handle(self, *args, **options):
        # We need to find duplicates based on normalized names within each category
        # Since we can't easily do normalization in a single SQL query with complex regex,
        # we'll fetch all flavors and group them in Python.
        
        categories = Category.objects.all()
        total_merged = 0

        for category in categories:
            flavors = Flavor.objects.filter(category=category)
            grouped: dict[str, list[Flavor]] = {}
            
            for f in flavors:
                norm = self.normalize_name(f.name)
                if norm not in grouped:
                    grouped[norm] = []
                grouped[norm].append(f)
            
            for norm_name, flavor_set in grouped.items():
                if len(flavor_set) > 1:
                    # Sort: external_id first (current catalog), then created_at
                    # We want to keep the one with external_id
                    flavor_set.sort(key=lambda x: (x.external_id is None, x.created_at))
                    
                    keep = flavor_set[0]
                    others = flavor_set[1:]
                    
                    self.stdout.write(
                        f"Merging {len(others)} duplicates into '{keep.name}' "
                        f"(Category: {category.name}, ID: {keep.id})"
                    )
                    
                    for other in others:
                        merge_flavors(keep, other)
                        total_merged += 1

        self.stdout.write(self.style.SUCCESS(f"Finished cleaning up {total_merged} duplicates."))
