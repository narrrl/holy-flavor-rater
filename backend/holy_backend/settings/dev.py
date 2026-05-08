"""Development settings. Selected by default via manage.py / wsgi.py / asgi.py."""

import os

from holy_backend.settings.base import *  # noqa: F401,F403

DEBUG = True

# Dev-only fallback. Override via SECRET_KEY env var if you want consistency
# across restarts (sessions invalidate when this changes).
SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "django-insecure-dev-only-do-not-use-in-production",
)

# Run Celery tasks synchronously in dev/tests unless a broker is available.
CELERY_TASK_ALWAYS_EAGER = os.environ.get("CELERY_TASK_ALWAYS_EAGER", "true").lower() == "true"
CELERY_TASK_EAGER_PROPAGATES = True
