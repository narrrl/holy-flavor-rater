"""Garbage collect orphan flavor image files.

Walks MEDIA_ROOT/flavors/ and removes directories whose paths are not referenced
by any Flavor.local_image_paths or Flavor.main_image_path. Use --dry-run to
preview without deleting.

Files referenced by the legacy Flavor.image ImageField are also preserved (for
backwards compatibility) until that field is dropped.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from api.models import Flavor


class Command(BaseCommand):
    help = "Remove orphan flavor image files / directories not referenced by any Flavor."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be deleted but don't touch the filesystem.",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        flavors_root = Path(settings.MEDIA_ROOT) / "flavors"
        if not flavors_root.exists():
            self.stdout.write(self.style.WARNING(f"No flavors dir at {flavors_root}"))
            return

        # Collect every relative path/directory that should be kept.
        referenced_files: set[str] = set()
        referenced_dirs: set[str] = set()
        legacy_image_files: set[str] = set()

        for flavor in Flavor.objects.all().only("local_image_paths", "main_image_path", "image"):
            paths = list(flavor.local_image_paths or [])
            if flavor.main_image_path:
                paths.append(flavor.main_image_path)
            for rel in paths:
                referenced_files.add(rel)
                referenced_dirs.add(os.path.dirname(rel))
            if flavor.image:
                legacy_image_files.add(flavor.image.name)

        # Walk the flavors tree and decide what's unreferenced.
        deleted_dirs: list[str] = []
        deleted_files: list[str] = []
        kept = 0

        for entry in sorted(flavors_root.iterdir()):
            rel_dir = f"flavors/{entry.name}"
            if entry.is_dir():
                if rel_dir in referenced_dirs:
                    # Drop only orphan files inside the referenced dir.
                    for f in entry.iterdir():
                        rel_file = f"{rel_dir}/{f.name}"
                        if f.is_file() and rel_file not in referenced_files:
                            deleted_files.append(rel_file)
                            if not dry_run:
                                f.unlink()
                        else:
                            kept += 1
                else:
                    deleted_dirs.append(rel_dir)
                    if not dry_run:
                        shutil.rmtree(entry)
            elif entry.is_file():
                rel_file = f"flavors/{entry.name}"
                if rel_file in legacy_image_files or rel_file in referenced_files:
                    kept += 1
                else:
                    deleted_files.append(rel_file)
                    if not dry_run:
                        entry.unlink()

        verb = "Would delete" if dry_run else "Deleted"
        self.stdout.write(
            self.style.SUCCESS(f"{verb}: {len(deleted_dirs)} dirs, {len(deleted_files)} files")
        )
        for path in deleted_dirs:
            self.stdout.write(f"  dir  {path}")
        for path in deleted_files:
            self.stdout.write(f"  file {path}")
        self.stdout.write(f"Kept: {kept} entries")
