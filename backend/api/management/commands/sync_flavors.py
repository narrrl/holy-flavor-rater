import hashlib
import os
import re
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from api.models import Category, Flavor

_DOWNLOAD_WORKERS = 8


class Command(BaseCommand):
    help = "Syncs flavors from Holy Energy Shopify API"

    def clean_html(self, raw_html):
        if not raw_html:
            return ""
        cleanr = re.compile("<.*?>")
        cleantext = re.sub(cleanr, "", raw_html)
        return cleantext.strip()

    def download_image_to_path(self, url, rel_path):
        """Download `url` to MEDIA_ROOT/rel_path. Skip if file already exists. Returns rel_path or None."""
        if not url:
            return None
        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        if os.path.exists(abs_path) and os.path.getsize(abs_path) > 0:
            return rel_path
        try:
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            response.raise_for_status()
            with open(abs_path, "wb") as f:
                f.write(response.content)
            return rel_path
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Failed to download {url}: {e}"))
            return None

    @staticmethod
    def _ext_for(url):
        path = urlparse(url).path
        ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
        return ext if ext in ("jpg", "jpeg", "png", "webp", "gif") else "png"

    @staticmethod
    def _hash_for(url):
        path = urlparse(url).path
        return hashlib.sha1(path.encode("utf-8")).hexdigest()[:10]

    def download_gallery(self, image_urls, dir_slug):
        """Download every URL into flavors/<dir_slug>/<i>_<hash>.<ext>. Returns list of rel paths.

        Downloads run in parallel; ordering of returned paths matches input ordering so
        the gallery index is preserved.
        """
        targets: list[tuple[int, str, str]] = []
        for i, url in enumerate(image_urls):
            if not url:
                continue
            filename = f"{i:02d}_{self._hash_for(url)}.{self._ext_for(url)}"
            rel = os.path.join("flavors", dir_slug, filename)
            targets.append((i, url, rel))

        if not targets:
            return []

        results: dict[int, str] = {}
        with ThreadPoolExecutor(max_workers=_DOWNLOAD_WORKERS) as ex:
            futures = {
                ex.submit(self.download_image_to_path, url, rel): i for i, url, rel in targets
            }
            for fut, i in futures.items():
                saved = fut.result()
                if saved:
                    results[i] = saved
        return [results[i] for i, _, _ in targets if i in results]

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
                flavor = Flavor.objects.filter(name=title, category=category).first()

            if not flavor:
                # 3. Try case-insensitive name match in category (safety for whitespace/case)
                flavor = Flavor.objects.filter(name__iexact=title, category=category).first()

            if not flavor:
                flavor = Flavor(external_id=p["id"], name=title, category=category, is_legacy=False)
                created_count += 1
            else:
                updated_count += 1
                if not flavor.external_id:
                    flavor.external_id = p["id"]
                if flavor.is_legacy:
                    flavor.is_legacy = False

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

            # Download whole gallery into flavors/<external_id>/
            dir_slug = str(p["id"])
            local_paths = self.download_gallery(image_urls_list, dir_slug)
            if local_paths:
                flavor.local_image_paths = local_paths
                # Drop main_image_path if it points to a file no longer in the gallery
                if flavor.main_image_path and flavor.main_image_path not in local_paths:
                    flavor.main_image_path = None
            elif not flavor.local_image_paths:
                # No new paths and nothing previously stored — leave both empty
                flavor.main_image_path = None

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
