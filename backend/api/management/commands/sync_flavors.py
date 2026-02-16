import json
import urllib.request
import re
import os
from django.core.management.base import BaseCommand
from django.core.files import File
from django.conf import settings
from django.utils.text import slugify
from api.models import Category, Flavor

class Command(BaseCommand):
    help = 'Syncs flavors from Holy Energy Shopify API'

    def clean_html(self, raw_html):
        if not raw_html:
            return ""
        cleanr = re.compile('<.*?>')
        cleantext = re.sub(cleanr, '', raw_html)
        return cleantext.strip()

    def download_image(self, url, flavor_name):
        if not url:
            return None
        try:
            safe_name = slugify(flavor_name)
            ext = url.split('.')[-1].split('?')[0].lower()
            if ext not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
                ext = 'png'
            
            filename = f"{safe_name}.{ext}"
            filepath = os.path.join(settings.MEDIA_ROOT, 'flavors', filename)
            
            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read()
                
            if not content:
                return None

            if os.path.exists(filepath):
                os.remove(filepath)

            with open(filepath, 'wb') as f:
                f.write(content)
            
            return f"flavors/{filename}"
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Failed to download image for {flavor_name}: {e}"))
            return None

    def handle(self, *args, **options):
        url = "https://weareholy.com/products.json?limit=250"
        self.stdout.write(f"Fetching from {url}...")
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to fetch data: {e}"))
            return

        products = data.get('products', [])
        self.stdout.write(f"Found {len(products)} products.")

        cat_map = {
            'energy': Category.objects.get_or_create(name='Energy', defaults={'slug': 'energy'})[0],
            'hydration': Category.objects.get_or_create(name='Hydration', defaults={'slug': 'hydration'})[0],
            'iced-tea': Category.objects.get_or_create(name='Iced Tea', defaults={'slug': 'iced-tea'})[0],
            'milkshake': Category.objects.get_or_create(name='Milkshake', defaults={'slug': 'milkshake'})[0],
            'packs': Category.objects.get_or_create(name='Packs and other', defaults={'slug': 'packs-and-other'})[0],
        }

        created_count = 0
        updated_count = 0
        synced_external_ids = []

        for p in products:
            title = p.get('title')
            tags = p.get('tags', [])
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(',')]
            
            tags_lower = [t.lower() for t in tags]
            title_lower = title.lower()

            is_pack = False
            pack_keywords = ['bundle', 'set', 'box', 'probe', 'sample', 'taster', 'starter', 'collection', 'probier']
            if any(k in title_lower for k in pack_keywords):
                is_pack = True
            if 'shaker' in title_lower or 'merch' in tags_lower:
                is_pack = True

            category = None
            if is_pack:
                category = cat_map['packs']
            elif 'holy energy' in tags_lower or 'energy' in tags_lower:
                category = cat_map['energy']
            elif 'holy hydration' in tags_lower or 'hydration' in tags_lower:
                category = cat_map['hydration']
            elif 'holy iced tea' in tags_lower or 'iced tea' in tags_lower:
                category = cat_map['iced-tea']
            elif 'milkshake' in tags_lower:
                category = cat_map['milkshake']
            
            if not category:
                if 'shaker' in tags_lower:
                     category = cat_map['packs']
                else:
                    continue

            variants = p.get('variants', [])
            is_available = any(v.get('available') for v in variants)
            images = p.get('images', [])
            image_url = images[0].get('src') if images else None
            description = self.clean_html(p.get('body_html', ''))
            handle = p.get('handle')
            shop_url = f"https://weareholy.com/products/{handle}" if handle else None

            # Find or create
            flavor = Flavor.objects.filter(external_id=p['id']).first()
            if not flavor:
                # Try to find by name AND category to avoid Milkshake/Iced Tea name collisions
                flavor = Flavor.objects.filter(name=title, category=category, is_legacy=False).first()
            
            if not flavor:
                # One last check: if name exists in DIFFERENT category, we still create a new one
                # If name exists in SAME category, we would have found it above.
                flavor = Flavor(external_id=p['id'], name=title, is_legacy=False)
                created_count += 1
            else:
                updated_count += 1

            flavor.category = category
            flavor.description = description
            flavor.shop_url = shop_url
            flavor.is_available = is_available
            flavor.external_id = p['id'] # Ensure ID is set
            
            if image_url:
                # Check if local file exists
                file_exists = False
                if flavor.image:
                    abs_path = os.path.join(settings.MEDIA_ROOT, flavor.image.name)
                    if os.path.exists(abs_path):
                        file_exists = True

                # Download if missing or URL changed
                if not file_exists or flavor.image_url != image_url:
                    rel_path = self.download_image(image_url, title)
                    if rel_path:
                        flavor.image = rel_path
                        self.stdout.write(f"Downloaded image for: {title}")
                    else:
                        self.stdout.write(self.style.WARNING(f"Failed to ensure image for: {title}"))
            
            flavor.image_url = image_url
            flavor.save()
            synced_external_ids.append(p['id'])

        discontinued_count = Flavor.objects.filter(external_id__isnull=False).exclude(external_id__in=synced_external_ids).update(is_available=False)
        self.stdout.write(self.style.SUCCESS(f"Finished! Created: {created_count}, Updated: {updated_count}, Marked Unavailable: {discontinued_count}"))
