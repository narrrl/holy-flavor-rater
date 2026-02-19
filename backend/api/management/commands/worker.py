import time
import sys
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone
from django.db import models
from api.models import Job
from io import StringIO

class Command(BaseCommand):
    help = 'Background worker to process scheduled and on-demand jobs.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting Holy Archive Worker..."))
        
        # Ensure all core jobs exist in the DB
        for job_type, label in Job.JOB_TYPES:
            Job.objects.get_or_create(name=job_type)

        while True:
            # 1. Find jobs that are either explicitly set to 'pending' (manual trigger)
            # or those where next_run has passed.
            now = timezone.now()
            jobs_to_run = Job.objects.filter(
                status__in=['pending', 'failed']
            ).filter(
                # Run if pending OR (next_run is set AND has passed)
                models.Q(status='pending') | 
                models.Q(next_run__lte=now, interval_hours__gt=0)
            )

            for job in jobs_to_run:
                self.run_job(job)

            time.sleep(30) # Check every 30 seconds

    def run_job(self, job):
        self.stdout.write(f"Executing Job: {job.get_name_display()}...")
        job.status = 'running'
        job.last_run = timezone.now()
        job.last_output = "" # Reset output for new run
        job.save()

        # Capture management command output
        class LiveStream(StringIO):
            def write(self, s):
                super().write(s)
                # Periodically update the DB with current output
                job.last_output = self.getvalue()
                job.save(update_fields=['last_output'])
            
        out = LiveStream()
        error = ""
        
        try:
            if job.name == 'sync_flavors':
                call_command('sync_flavors', stdout=out)
            elif job.name == 'cleanup_duplicates':
                call_command('cleanup_duplicates', stdout=out)
            elif job.name == 'backup_db':
                call_command('backup_db', '--full', stdout=out)
            elif job.name == 'seed_legacy':
                call_command('seed_legacy_flavors', stdout=out)
            
            job.status = 'completed'
        except Exception as e:
            job.status = 'failed'
            error = str(e)
            self.stdout.write(self.style.ERROR(f"Job failed: {error}"))

        # Update scheduling for next run if interval is set
        if job.interval_hours > 0:
            job.next_run = timezone.now() + timedelta(hours=job.interval_hours)
        else:
            job.next_run = None

        job.last_output = out.getvalue()
        job.error_message = error
        job.save()
        self.stdout.write(self.style.SUCCESS(f"Job finished: {job.status}"))
