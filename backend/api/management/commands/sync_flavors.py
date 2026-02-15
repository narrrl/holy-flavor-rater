import json
import urllib.request
import re
from django.core.management.base import BaseCommand
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

    def handle(self, *args, **options):
        url = "https://weareholy.com/products.json?limit=250"
        self.stdout.write(f"Fetching from {url}...")
        
        try:
            with urllib.request.urlopen(url) as response:
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

            # Check for Packs/Bundles/Samples first
            is_pack = False
            pack_keywords = ['bundle', 'pack', 'set', 'box', 'probe', 'sample', 'taster', 'shaker', 'starter']
            
            # Check title keywords
            if any(k in title_lower for k in pack_keywords):
                is_pack = True
            
            # Check product type keywords
            if any(k in product_type for k in pack_keywords):
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
            
            # Skip only pure merch (clothing etc) if it's not a pack
            if not category:
                if 'merch' in tags_lower:
                    continue
                # If we still don't have a category but it's a product, maybe put it in Packs/Other as fallback?
                # For now, let's skip to avoid clutter unless we are sure.
                continue

            # Check availability
            variants = p.get('variants', [])
            is_available = any(v.get('available') for v in variants)

            # Image
            images = p.get('images', [])
            image_url = images[0].get('src') if images else None

            # Description
            description = self.clean_html(p.get('body_html', ''))

            # Shop URL
            handle = p.get('handle')
            shop_url = f"https://weareholy.com/products/{handle}" if handle else None

            # Create or update
            # Try finding by external_id first, then by name
            flavor = Flavor.objects.filter(external_id=p['id']).first()
            if not flavor:
                flavor = Flavor.objects.filter(name=title).first()
            
            if flavor:
                flavor.external_id = p['id']
                flavor.name = title
                flavor.category = category
                flavor.description = description
                flavor.image_url = image_url
                flavor.shop_url = shop_url
                flavor.is_available = is_available
                flavor.save()
                updated_count += 1
            else:
                Flavor.objects.create(
                    external_id=p['id'],
                    name=title,
                    category=category,
                    description=description,
                    image_url=image_url,
                    shop_url=shop_url,
                    is_available=is_available
                )
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Finished! Created: {created_count}, Updated: {updated_count}"))
