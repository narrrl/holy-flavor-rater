import json
import os
import urllib.request
from django.core.management.base import BaseCommand
from django.core.files import File
from tempfile import NamedTemporaryFile
from django.conf import settings
from api.models import Category, Flavor

class Command(BaseCommand):
    help = 'Adds legacy flavors from JSON files in the legacy/ folder'

    def download_image(self, url, flavor_name):
        if not url:
            return None
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                img_temp = NamedTemporaryFile(delete=True)
                img_temp.write(response.read())
                img_temp.flush()
                
                ext = url.split('.')[-1].split('?')[0]
                if len(ext) > 4: ext = 'png'
                filename = f"legacy_{flavor_name.replace(' ', '_').lower()}.{ext}"
                return File(img_temp, name=filename)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not download image for {flavor_name}: {e}"))
            return None

    def handle(self, *args, **options):
        # 1. Remove old legacy flavors (ones without external_id or marked as legacy)
        # To be safe, we only remove those marked as legacy or with no external_id
        removed_count, _ = Flavor.objects.filter(is_legacy=True).delete()
        Flavor.objects.filter(external_id__isnull=True).delete()
        self.stdout.write(self.style.SUCCESS(f"Removed {removed_count} old legacy flavors."))

        # Ensure main categories exist
        energy = Category.objects.get_or_create(name='Energy', defaults={'slug': 'energy'})[0]
        hydration = Category.objects.get_or_create(name='Hydration', defaults={'slug': 'hydration'})[0]
        iced_tea = Category.objects.get_or_create(name='Iced Tea', defaults={'slug': 'iced-tea'})[0]
        packs = Category.objects.get_or_create(name='Packs and other', defaults={'slug': 'packs-and-other'})[0]

        # Try both common locations for the legacy folder
        legacy_dir = os.path.join(settings.BASE_DIR, 'legacy')
        if not os.path.exists(legacy_dir):
            legacy_dir = os.path.join(settings.BASE_DIR, '..', 'legacy')
            
        if not os.path.exists(legacy_dir):
            self.stdout.write(self.style.ERROR(f"Legacy directory not found. Checked: {os.path.join(settings.BASE_DIR, 'legacy')} and {os.path.join(settings.BASE_DIR, '..', 'legacy')}"))
            return

        json_files = [f for f in os.listdir(legacy_dir) if f.endswith('.json')]
        
        created_count = 0

        for json_file in json_files:
            file_path = os.path.join(legacy_dir, json_file)
            with open(file_path, 'r', encoding='utf-8') as f:
                data_list = json.load(f)
            
            for data in data_list:
                name = data.get('Name')
                desc = data.get('Beschreibung')
                taste = data.get('Geschmack')
                status_text = data.get('Status')
                image_url = data.get('Bild_URL')

                full_desc = f"**Geschmack:** {taste}\n\n{desc}\n\n**Status:** {status_text}"
                
                # Determine category
                cat = energy
                if "hydration" in name.lower() or "hydration" in desc.lower():
                    cat = hydration
                elif "iced tea" in name.lower() or "eistee" in name.lower():
                    cat = iced_tea
                elif any(k in name.lower() for k in ['bundle', 'set', 'box', 'probe', 'sample', 'taster', 'shaker', 'starter']):
                    cat = packs

                flavor = Flavor(
                    name=name,
                    category=cat,
                    description=full_desc,
                    image_url=image_url,
                    is_available=False,
                    is_legacy=True,
                    external_id=None
                )

                if image_url:
                    img_file = self.download_image(image_url, name)
                    if img_file:
                        flavor.image.save(img_file.name, img_file, save=False)
                
                flavor.save()
                created_count += 1
                self.stdout.write(f"Added legacy flavor: {name}")

        self.stdout.write(self.style.SUCCESS(f"Finished! Created {created_count} legacy flavors from JSON."))
