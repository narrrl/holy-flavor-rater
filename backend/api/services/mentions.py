import re

from api.models import Notification, Rating, Reply, User

_MENTION_RE = re.compile(r"@(\w+)")


def parse_mentions(
    text: str,
    actor: User,
    rating: Rating | None = None,
    reply: Reply | None = None,
) -> None:
    if not text:
        return
    for username in set(_MENTION_RE.findall(text)):
        try:
            recipient = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            continue
        if recipient == actor:
            continue
        Notification.objects.get_or_create(
            recipient=recipient,
            actor=actor,
            notification_type="mention",
            rating=rating,
            reply=reply,
        )
