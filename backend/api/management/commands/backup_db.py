import sqlite3
import os
import shutil
from datetime import datetime, timedelta
from django.conf import settings
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Creates a safe, consistent backup of the SQLite database and manages rotation.'

    def add_arguments(self, parser):
        parser.add_argument('--output', type=str, help='Specific output path for the backup file')
        parser.add_argument('--retention', type=int, default=7, help='Number of days to keep old backups')
        parser.add_argument('--full', action='store_true', help='Create a full archive including media')

    def handle(self, *args, **options):
        db_conf = settings.DATABASES['default']
        if db_conf['ENGINE'] != 'django.db.backends.sqlite3':
            self.stdout.write(self.style.ERROR("This command only supports SQLite."))
            return

        db_path = str(db_conf['NAME'])
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # 1. Database Backup
        if options['output']:
            db_backup_path = options['output']
        else:
            db_backup_path = os.path.join(backup_dir, f'db_backup_{timestamp}.sqlite3')

        self.stdout.write(f"Cloning database {db_path}...")
        
        try:
            src = sqlite3.connect(db_path)
            dst = sqlite3.connect(db_backup_path)
            with dst:
                src.backup(dst)
            dst.close()
            src.close()
            self.stdout.write(self.style.SUCCESS(f"DB backup created: {db_backup_path}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"DB backup failed: {e}"))
            return

        # 2. Full Archive (Optional)
        if options['full']:
            import tarfile
            archive_name = f"full_backup_{timestamp}.tar.gz"
            archive_path = os.path.join(backup_dir, archive_name)
            self.stdout.write(f"Creating full archive at {archive_path}...")
            
            try:
                with tarfile.open(archive_path, "w:gz") as tar:
                    # Add database
                    tar.add(db_backup_path, arcname="db.sqlite3")
                    # Add media
                    media_dir = str(settings.MEDIA_ROOT)
                    if os.path.exists(media_dir):
                        tar.add(media_dir, arcname="media")
                
                # Remove the raw sqlite backup after bundling it into the archive
                if not options['output']:
                    os.remove(db_backup_path)
                
                self.stdout.write(self.style.SUCCESS(f"Full archive created successfully."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Archive creation failed: {e}"))

        # 3. Cleanup Old Backups
        retention_days = options['retention']
        cutoff = datetime.now() - timedelta(days=retention_days)
        
        self.stdout.write(f"Cleaning up backups older than {retention_days} days...")
        for filename in os.listdir(backup_dir):
            file_path = os.path.join(backup_dir, filename)
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_time < cutoff:
                    try:
                        os.remove(file_path)
                        self.stdout.write(self.style.SUCCESS(f"  -> Deleted old backup: {filename}"))
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"  -> Failed to delete {filename}: {e}"))
