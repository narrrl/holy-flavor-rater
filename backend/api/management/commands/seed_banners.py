from django.core.management.base import BaseCommand
from api.models import Banner
import os
import json

class Command(BaseCommand):
    help = 'Seeds banner models and missing settings from JSON files in backend/banners/'

    def handle(self, *args, **options):
        # Determine the banners directory relative to the project root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        banners_dir = os.path.join(project_root, 'banners')
        
        if not os.path.exists(banners_dir):
            self.stdout.write(self.style.WARNING(f"Banners directory not found at {banners_dir}"))
            return

        for filename in os.listdir(banners_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(banners_dir, filename)
                try:
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                    
                    slug = data.get('slug')
                    if not slug:
                        continue

                    banner, created = Banner.objects.get_or_create(
                        slug=slug,
                        defaults={
                            'name': data.get('name', slug),
                            'description': data.get('description', ''),
                            'settings': data.get('settings', {})
                        }
                    )

                    if not created:
                        # Sync missing settings from JSON to DB without overwriting existing keys
                        db_settings = banner.settings or {}
                        json_settings = data.get('settings', {})
                        json_schema = data.get('schema', [])
                        
                        updated = False
                        # Sync missing settings
                        for key, value in json_settings.items():
                            if key not in db_settings:
                                db_settings[key] = value
                                updated = True
                        
                        # Always sync schema as it represents the UI structure
                        if banner.schema != json_schema:
                            banner.schema = json_schema
                            updated = True
                            
                        if updated:
                            banner.settings = db_settings
                            banner.save()
                            self.stdout.write(self.style.SUCCESS(f"Synced new settings for banner '{slug}' from {filename}"))
                    else:
                        self.stdout.write(self.style.SUCCESS(f"Created new banner '{slug}' from {filename}"))

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to sync banner from {filename}: {e}"))
