from django.db import transaction
from api.models import Flavor, Rating, Reply

def merge_flavors(keep_flavor: Flavor, remove_flavor: Flavor) -> None:
    """
    Merges remove_flavor into keep_flavor.
    Re-assigns all ratings and ensures integrity by keeping the most detailed
    review if a user has rated both.
    """
    if keep_flavor.id == remove_flavor.id:
        return

    with transaction.atomic():
        # Re-assign or resolve ratings
        remove_ratings = Rating.objects.filter(flavor=remove_flavor)
        
        for rating in remove_ratings:
            # Check if user already rated the target flavor
            existing_rating = Rating.objects.filter(user=rating.user, flavor=keep_flavor).first()
            
            if not existing_rating:
                # Safe to just move it
                rating.flavor = keep_flavor
                rating.save()
            else:
                # Conflict Resolution: Keep the longest comment
                keep_comment = existing_rating.comment or ""
                remove_comment = rating.comment or ""
                
                if len(remove_comment) > len(keep_comment):
                    # Update the one we are keeping to have the better content from the one being removed
                    existing_rating.score = rating.score
                    existing_rating.comment = rating.comment
                    existing_rating.save()
                
                # Move ALL replies from the rating being deleted to the one being kept
                Reply.objects.filter(rating=rating).update(rating=existing_rating)
                
                # Delete the redundant rating
                rating.delete()

        # Transfer external_id if keep_flavor doesn't have one
        if not keep_flavor.external_id and remove_flavor.external_id:
            keep_flavor.external_id = remove_flavor.external_id
            keep_flavor.save(update_fields=["external_id"])

        # Finally, delete the flavor
        remove_flavor.delete()
