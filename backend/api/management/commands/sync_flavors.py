import json
import urllib.request
import re
import os
from django.core.management.base import BaseCommand
from django.core.files import File
from tempfile import NamedTemporaryFile
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
            # Simple caching: check if we already have a local image for this URL
            # (In a real app, you might compare filenames or hashes)
            img_temp = NamedTemporaryFile(delete=True)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                img_temp.write(response.read())
            img_temp.flush()
            
            # Use extension from URL or default to .png
            ext = url.split('.')[-1].split('?')[0]
            if len(ext) > 4: ext = 'png'
            filename = f"{flavor_name.replace(' ', '_').lower()}.{ext}"
            return File(img_temp, name=filename)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not download image for {flavor_name}: {e}"))
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

        # Ensure categories exist
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
            product_type = p.get('product_type', '').lower()
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(',')]
            
            # Determine category
            category = None
            tags_lower = [t.lower() for t in tags]
            title_lower = title.lower()

            is_pack = False
            pack_keywords = ['bundle', 'set', 'box', 'probe', 'sample', 'taster', 'starter', 'collection', 'probier']
            if any(k in title_lower for k in pack_keywords):
                is_pack = True
            if 'shaker' in title_lower or 'merch' in tags_lower:
                is_pack = True

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

            # Create or update
            flavor = Flavor.objects.filter(external_id=p['id']).first()
            if not flavor:
                flavor = Flavor.objects.filter(name=title, is_legacy=False).first()
            
            if flavor:
                flavor.external_id = p['id']
                flavor.name = title
                flavor.category = category
                flavor.description = description
                flavor.shop_url = shop_url
                flavor.is_available = is_available
                flavor.is_legacy = False # API flavors are not legacy
                
                # Cache image if URL changed or local image missing
                if image_url and (flavor.image_url != image_url or not flavor.image):
                    img_file = self.download_image(image_url, title)
                    if img_file:
                        flavor.image.save(img_file.name, img_file, save=False)
                
                flavor.image_url = image_url
                flavor.save()
                updated_count += 1
            else:
                new_flavor = Flavor(
                    external_id=p['id'],
                    name=title,
                    category=category,
                    description=description,
                    image_url=image_url,
                    shop_url=shop_url,
                    is_available=is_available,
                    is_legacy=False
                )
                if image_url:
                    img_file = self.download_image(image_url, title)
                    if img_file:
                        new_flavor.image.save(img_file.name, img_file, save=False)
                new_flavor.save()
                created_count += 1
            
            synced_external_ids.append(p['id'])

        # Mark flavors NOT in the sync as unavailable (only for those that have an external_id)
        # These are discontinued API flavors.
        discontinued_count = Flavor.objects.filter(external_id__isnull=False).exclude(external_id__in=synced_external_ids).update(is_available=False)

        self.stdout.write(self.style.SUCCESS(f"Finished! Created: {created_count}, Updated: {updated_count}, Marked Unavailable: {discontinued_count}"))
