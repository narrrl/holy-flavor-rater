import hashlib
import json
import os
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from api.models import Category, Flavor


class Command(BaseCommand):
    help = "Adds legacy flavors from JSON files in the legacy/ folder"

    def download_image(self, url, flavor_name):
        """Download legacy image into flavors/legacy_<slug>/00_<hash>.<ext>. Returns rel path."""
        if not url:
            return None
        try:
            safe_name = slugify(flavor_name)
            path = urlparse(url).path
            ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
            if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
                ext = "png"
            url_hash = hashlib.sha1(path.encode("utf-8")).hexdigest()[:10]
            rel_path = os.path.join("flavors", f"legacy_{safe_name}", f"00_{url_hash}.{ext}")
            abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
            if os.path.exists(abs_path) and os.path.getsize(abs_path) > 0:
                return rel_path
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            response.raise_for_status()
            with open(abs_path, "wb") as f:
                f.write(response.content)
            return rel_path
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f"Failed to download image for {flavor_name}: {e}")
            )
            return None

    def handle(self, *args, **options):
        # We no longer delete everything to preserve user data like ratings
        # Instead, we update existing entries.

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

        legacy_dir = os.path.join(settings.BASE_DIR, "legacy")
        if not os.path.exists(legacy_dir):
            legacy_dir = os.path.join(settings.BASE_DIR, "..", "legacy")

        if not os.path.exists(legacy_dir):
            self.stdout.write(self.style.ERROR("Legacy directory not found."))
            return

        json_files = [f for f in os.listdir(legacy_dir) if f.endswith(".json")]
        processed_count = 0

        for json_file in json_files:
            file_path = os.path.join(legacy_dir, json_file)
            file_lower = json_file.lower()

            # Determine category from filename
            if "energy" in file_lower:
                file_cat = cat_map["energy"]
            elif "iced_tea" in file_lower or "iced-tea" in file_lower:
                file_cat = cat_map["iced-tea"]
            elif "hydration" in file_lower:
                file_cat = cat_map["hydration"]
            elif "milkshake" in file_lower:
                file_cat = cat_map["milkshake"]
            else:
                file_cat = None

            with open(file_path, encoding="utf-8") as f:
                data_list = json.load(f)

            for data in data_list:
                name = data.get("Name")
                desc = data.get("Beschreibung")
                taste = data.get("Geschmack")
                status_text = data.get("Status")
                image_url = data.get("Bild_URL")

                full_desc = f"**Geschmack:** {taste}\n\n{desc}\n\n**Status:** {status_text}"

                # Determine final category
                cat = file_cat
                if not cat:
                    # Fallback to name/desc detection if filename was ambiguous
                    if "hydration" in name.lower() or "hydration" in desc.lower():
                        cat = cat_map["hydration"]
                    elif "iced tea" in name.lower() or "eistee" in name.lower():
                        cat = cat_map["iced-tea"]
                    elif "milkshake" in name.lower():
                        cat = cat_map["milkshake"]
                    elif any(
                        k in name.lower()
                        for k in [
                            "bundle",
                            "set",
                            "box",
                            "probe",
                            "sample",
                            "taster",
                            "shaker",
                            "starter",
                        ]
                    ):
                        cat = cat_map["packs"]
                    else:
                        cat = cat_map["energy"]  # Ultimate fallback

                # Try to find existing flavor by name and category regardless of legacy status
                flavor = Flavor.objects.filter(name__iexact=name, category=cat).first()

                # If it exists and is an active Shopify product, skip legacy processing
                if flavor and not flavor.is_legacy:
                    self.stdout.write(f"Skipping active flavor: {name}")
                    continue

                if not flavor:
                    flavor = Flavor(name=name, category=cat, is_legacy=True, external_id=None)
                    self.stdout.write(f"Adding new legacy flavor: {name}")
                else:
                    self.stdout.write(f"Updating legacy flavor: {name}")

                flavor.description = full_desc
                flavor.is_available = False  # Legacy is always unavailable via API

                if image_url:
                    rel_path = self.download_image(image_url, name)
                    if rel_path:
                        flavor.local_image_paths = [rel_path]
                        if (
                            flavor.main_image_path
                            and flavor.main_image_path not in flavor.local_image_paths
                        ):
                            flavor.main_image_path = None
                        self.stdout.write(f"  -> Image for: {name}")

                flavor.image_url = image_url
                flavor.image_urls = [image_url] if image_url else []
                flavor.save()
                processed_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Finished! Processed {processed_count} legacy flavors.")
        )
