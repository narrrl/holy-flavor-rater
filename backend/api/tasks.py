"""Celery tasks for Holy Flavors.

Each @shared_task wraps an existing management command so that the same
code path remains usable from the CLI for manual ops. The legacy ``Job``
rows are kept as an execution log: tasks update the matching row with
status/output/timestamps so the admin UI keeps working.
"""

from __future__ import annotations

from datetime import timedelta
from io import StringIO
from typing import Any

from celery import shared_task
from celery.utils.log import get_task_logger
from django.core.mail import send_mail
from django.core.management import call_command
from django.utils import timezone

logger = get_task_logger(__name__)


def _run_command_job(job_name: str, command: str, *args: str) -> str:
    """Run a management command and mirror status/output into the Job row."""
    from api.models import Job

    job, _ = Job.objects.get_or_create(name=job_name)
    job.status = "running"
    job.last_run = timezone.now()
    job.last_output = ""
    job.error_message = ""
    job.save(update_fields=["status", "last_run", "last_output", "error_message"])

    out = StringIO()
    try:
        call_command(command, *args, stdout=out)
        job.status = "completed"
    except Exception as exc:  # noqa: BLE001
        job.status = "failed"
        job.error_message = str(exc)
        logger.exception("Job %s failed", job_name)
        raise
    finally:
        job.last_output = out.getvalue()
        if job.interval_hours > 0:
            job.next_run = timezone.now() + timedelta(hours=job.interval_hours)
        else:
            job.next_run = None
        job.save()

    return job.last_output


@shared_task(name="api.sync_flavors")
def sync_flavors_task() -> str:
    return _run_command_job("sync_flavors", "sync_flavors")


@shared_task(name="api.cleanup_duplicates")
def cleanup_duplicates_task() -> str:
    return _run_command_job("cleanup_duplicates", "cleanup_duplicates")


@shared_task(name="api.backup_db")
def backup_db_task() -> str:
    return _run_command_job("backup_db", "backup_db", "--full")


@shared_task(name="api.seed_legacy")
def seed_legacy_task() -> str:
    return _run_command_job("seed_legacy", "seed_legacy_flavors")


@shared_task(
    name="api.send_email",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def send_email_task(
    subject: str,
    message: str,
    recipient_list: list[str],
    from_email: str | None = None,
    **kwargs: Any,
) -> int:
    """Async wrapper around django.core.mail.send_mail."""
    return send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=recipient_list,
        fail_silently=False,
        **kwargs,
    )
