import os
import re

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from api.models import Category, Flavor


class Command(BaseCommand):
    help = "Syncs flavors from Holy Energy Shopify API"

    def clean_html(self, raw_html):
        if not raw_html:
            return ""
        cleanr = re.compile("<.*?>")
        cleantext = re.sub(cleanr, "", raw_html)
        return cleantext.strip()

    def download_image(self, url, flavor_name):
        if not url:
            return None
        try:
            safe_name = slugify(flavor_name)
            ext = url.split(".")[-1].split("?")[0].lower()
            if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
                ext = "png"

            filename = f"{safe_name}.{ext}"
            filepath = os.path.join(settings.MEDIA_ROOT, "flavors", filename)

            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            response.raise_for_status()

            if os.path.exists(filepath):
                os.remove(filepath)

            with open(filepath, "wb") as f:
                f.write(response.content)

            return f"flavors/{filename}"
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f"Failed to download image for {flavor_name}: {e}")
            )
            return None

    def handle(self, *args, **options):
        url = "https://weareholy.com/products.json?limit=250"
        self.stdout.write(f"Fetching from {url}...")

        try:
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to fetch data: {e}"))
            return

        products = data.get("products", [])
        self.stdout.write(f"Found {len(products)} products.")

        cat_map = {
            "energy": Category.objects.get_or_create(name="Energy", defaults={"slug": "energy"})[0],
            "hydration": Category.objects.get_or_create(
                name="Hydration", defaults={"slug": "hydration"}
            )[0],
            "iced-tea": Category.objects.get_or_create(
                name="Iced Tea", defaults={"slug": "iced-tea"}
            )[0],
            "milkshake": Category.objects.get_or_create(
                name="Milkshake", defaults={"slug": "milkshake"}
            )[0],
            "packs": Category.objects.get_or_create(
                name="Packs and other", defaults={"slug": "packs-and-other"}
            )[0],
        }

        created_count = 0
        updated_count = 0
        synced_external_ids = []

        for p in products:
            title = p.get("title", "").strip()
            tags = p.get("tags", [])
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",")]

            tags_lower = [t.lower() for t in tags]
            title_lower = title.lower()

            is_pack = False
            pack_keywords = [
                "bundle",
                "set",
                "box",
                "probe",
                "sample",
                "taster",
                "starter",
                "collection",
                "probier",
            ]
            if any(k in title_lower for k in pack_keywords):
                is_pack = True
            if "shaker" in title_lower or "merch" in tags_lower:
                is_pack = True

            category = None
            if is_pack:
                category = cat_map["packs"]
            elif "holy energy" in tags_lower or "energy" in tags_lower:
                category = cat_map["energy"]
            elif "holy hydration" in tags_lower or "hydration" in tags_lower:
                category = cat_map["hydration"]
            elif "holy iced tea" in tags_lower or "iced tea" in tags_lower:
                category = cat_map["iced-tea"]
            elif "milkshake" in tags_lower:
                category = cat_map["milkshake"]

            if not category:
                if "shaker" in tags_lower:
                    category = cat_map["packs"]
                else:
                    continue

            variants = p.get("variants", [])
            is_available = any(v.get("available") for v in variants)
            images = p.get("images", [])
            image_url = images[0].get("src") if images else None
            image_urls_list = [img.get("src") for img in images if img.get("src")]
            description = self.clean_html(p.get("body_html", ""))
            handle = p.get("handle")
            shop_url = f"https://weareholy.com/products/{handle}" if handle else None

            # Find or create - be very specific to avoid duplicates
            # 1. Try external_id
            flavor = Flavor.objects.filter(external_id=p["id"]).first()

            if not flavor:
                # 2. Try exact name match in category
                # REMOVED: is_legacy=False
                flavor = Flavor.objects.filter(name=title, category=category).first()

            if not flavor:
                # 3. Try case-insensitive name match in category (safety for whitespace/case)
                # REMOVED: is_legacy=False
                flavor = Flavor.objects.filter(name__iexact=title, category=category).first()

            if not flavor:
                flavor = Flavor(external_id=p["id"], name=title, category=category, is_legacy=False)
                created_count += 1
            else:
                updated_count += 1
                # Ensure external_id is updated if it was missing
                if not flavor.external_id:
                    flavor.external_id = p["id"]

                # Reactivate the flavor if it was previously marked as legacy
                if flavor.is_legacy:
                    flavor.is_legacy = False

            # Ensure all synced fields are accurately reflected
            if (
                flavor.name != title
                and not Flavor.objects.filter(name=title, category=category)
                .exclude(pk=flavor.pk)
                .exists()
            ):
                flavor.name = title

            flavor.description = description
            flavor.shop_url = shop_url
            flavor.is_available = is_available

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
                        self.stdout.write(
                            self.style.WARNING(f"Failed to ensure image for: {title}")
                        )

            flavor.image_url = image_url
            flavor.image_urls = image_urls_list
            flavor.save()
            synced_external_ids.append(p["id"])

        discontinued_count = (
            Flavor.objects.filter(external_id__isnull=False)
            .exclude(external_id__in=synced_external_ids)
            .update(is_available=False)
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Finished! Created: {created_count}, Updated: {updated_count}, Marked Unavailable: {discontinued_count}"
            )
        )
