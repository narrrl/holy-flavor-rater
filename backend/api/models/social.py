from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ("reply", "Reply"),
        ("mention", "Mention"),
        ("follow", "Follow"),
        ("ticket_new", "New Ticket"),
        ("ticket_reply", "Ticket Reply"),
        ("profile_comment", "Profile Comment"),
    ]
    recipient = models.ForeignKey(
        "api.User", related_name="notifications", on_delete=models.CASCADE
    )
    actor = models.ForeignKey("api.User", related_name="actions", on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    rating = models.ForeignKey("api.Rating", on_delete=models.CASCADE, null=True, blank=True)
    reply = models.ForeignKey("api.Reply", on_delete=models.CASCADE, null=True, blank=True)
    ticket = models.ForeignKey("api.Ticket", on_delete=models.CASCADE, null=True, blank=True)
    profile_comment = models.ForeignKey(
        "api.ProfileComment", on_delete=models.CASCADE, null=True, blank=True
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.notification_type} for {self.recipient.username}"


class ProfileComment(models.Model):
    profile_owner = models.ForeignKey(
        "api.User", related_name="profile_comments", on_delete=models.CASCADE
    )
    author = models.ForeignKey(
        "api.User", related_name="authored_profile_comments", on_delete=models.CASCADE
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
