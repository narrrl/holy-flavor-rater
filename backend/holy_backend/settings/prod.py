"""Production settings. Set DJANGO_SETTINGS_MODULE=holy_backend.settings.prod."""

import os

from holy_backend.settings.base import *  # noqa: F401,F403

DEBUG = False

# Required in production. Fail loudly if not set.
try:
    SECRET_KEY = os.environ["SECRET_KEY"]
except KeyError as exc:
    raise RuntimeError("SECRET_KEY environment variable must be set in production.") from exc

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
