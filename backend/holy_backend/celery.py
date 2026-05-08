"""Celery application for holy_backend.

Autodiscovers tasks from installed Django apps. Broker/backend configuration
is read from Django settings (CELERY_* namespace).
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "holy_backend.settings.dev")

app = Celery("holy_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
