from django.db import transaction

from api.models import Flavor, Notification, Rating, Reply


def _quality(rating: Rating) -> tuple[int, object]:
    """Rank a rating for conflict resolution: longest comment wins, newer breaks ties."""
    return (len(rating.comment or ""), rating.created_at)


def merge_flavors(keep_flavor: Flavor, remove_flavor: Flavor) -> None:
    """
    Merges remove_flavor into keep_flavor.

    Re-assigns all ratings. When a user rated both flavors, the higher-quality
    review survives (longest comment, newer on ties) and its replies +
    notifications are re-pointed to the surviving row.
    """
    if keep_flavor.id == remove_flavor.id:
        return

    with transaction.atomic():
        for incoming in Rating.objects.filter(flavor=remove_flavor):
            existing = Rating.objects.filter(user=incoming.user, flavor=keep_flavor).first()

            if existing is None:
                # No conflict — move the rating wholesale.
                incoming.flavor = keep_flavor
                incoming.save(update_fields=["flavor"])
                continue

            # Conflict: keep one row (unique_together user+flavor). If the
            # incoming review is better, copy its content + timestamp onto the
            # surviving row so the comment and its date stay consistent.
            if _quality(incoming) > _quality(existing):
                existing.score = incoming.score
                existing.comment = incoming.comment
                existing.created_at = incoming.created_at  # auto_now_add ignores updates
                existing.save(update_fields=["score", "comment", "created_at"])

            # Preserve community feedback attached to the discarded rating.
            Reply.objects.filter(rating=incoming).update(rating=existing)
            Notification.objects.filter(rating=incoming).update(rating=existing)
            incoming.delete()

        # Carry over the Shopify link if the kept flavor lacks one. external_id
        # is unique, so the donor row must be gone before we assign it.
        inherited_external_id = remove_flavor.external_id if not keep_flavor.external_id else None

        remove_flavor.delete()

        if inherited_external_id is not None:
            keep_flavor.external_id = inherited_external_id
            keep_flavor.save(update_fields=["external_id"])
