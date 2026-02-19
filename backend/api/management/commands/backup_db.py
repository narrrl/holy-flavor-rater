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

    def handle(self, *args, **options):
        db_conf = settings.DATABASES['default']
        if db_conf['ENGINE'] != 'django.db.backends.sqlite3':
            self.stdout.write(self.style.ERROR("This command only supports SQLite."))
            return

        db_path = str(db_conf['NAME'])
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)

        # 1. Database Backup
        if options['output']:
            backup_path = options['output']
        else:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_path = os.path.join(backup_dir, f'db_backup_{timestamp}.sqlite3')

        self.stdout.write(f"Starting backup of {db_path}...")
        
        try:
            # Use SQLite's online backup API for a consistent copy
            src = sqlite3.connect(db_path)
            dst = sqlite3.connect(backup_path)
            with dst:
                src.backup(dst)
            dst.close()
            src.close()
            self.stdout.write(self.style.SUCCESS(f"Successfully backed up database to {backup_path}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Database backup failed: {e}"))
            return

        # 2. Cleanup Old Backups
        retention_days = options['retention']
        cutoff = datetime.now() - timedelta(days=retention_days)
        
        self.stdout.write(f"Cleaning up backups older than {retention_days} days...")
        for filename in os.listdir(backup_dir):
            file_path = os.path.join(backup_dir, filename)
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_time < cutoff:
                    os.remove(file_path)
                    self.stdout.write(f"  -> Deleted: {filename}")
