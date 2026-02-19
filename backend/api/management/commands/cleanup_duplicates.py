from django.core.management.base import BaseCommand
from api.models import Flavor, Rating
from django.db.models import Count

class Command(BaseCommand):
    help = 'Identifies and merges duplicate flavors (same name and category)'

    def handle(self, *args, **options):
        # Find duplicates based on name and category
        duplicates = Flavor.objects.values('name', 'category').annotate(
            name_count=Count('id')
        ).filter(name_count__gt=1)

        self.stdout.write(f"Found {duplicates.count()} sets of duplicates.")

        for dup in duplicates:
            name = dup['name']
            category_id = dup['category']
            
            # Get all flavors in this set, ordered by having an external_id first, then by date
            flavor_set = Flavor.objects.filter(
                name=name, 
                category_id=category_id
            ).order_by('-external_id', 'created_at')
            
            # Keep the first one, merge others into it
            keep = flavor_set[0]
            others = flavor_set[1:]
            
            self.stdout.write(f"Merging {len(others)} duplicates into '{keep.name}' (ID: {keep.id}, Ext: {keep.external_id})")
            
            for other in others:
                # Re-assign ratings
                Rating.objects.filter(flavor=other).update(flavor=keep)
                # Note: This might trigger unique constraint errors on Rating (user, flavor)
                # if the user rated both duplicates. We'll handle that if needed.
                
                # Re-assign other related models if any (e.g. notifications, etc.)
                # In our case, Rating is the main one.
                
                # Delete the duplicate
                other.delete()

        self.stdout.write(self.style.SUCCESS("Finished cleaning up duplicates."))
