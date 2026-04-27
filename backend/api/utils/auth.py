"""Auth helpers for narrowing request.user to the concrete User type.

DRF's `request.user` is typed as `User | AnonymousUser`. After a view enforces
`IsAuthenticated`, the union is misleading: every code path past the permission
check has the concrete user. These helpers express that narrowing for mypy and
keep view bodies readable.
"""

from __future__ import annotations

from rest_framework.exceptions import NotAuthenticated
from rest_framework.request import Request

from api.models import User


def current_user(request: Request) -> User:
    """Return the authenticated User for `request` or raise 401.

    Use after `IsAuthenticated` permission. The check is defensive — the
    permission class already rejected anonymous calls.
    """
    user = request.user
    if not isinstance(user, User):
        raise NotAuthenticated
    return user
