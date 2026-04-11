from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Rating(models.Model):
    user = models.ForeignKey("api.User", related_name="ratings", on_delete=models.CASCADE)
    flavor = models.ForeignKey("api.Flavor", related_name="ratings", on_delete=models.CASCADE)
    score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "flavor")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.username} - {self.flavor.name}: {self.score}"


class Reply(models.Model):
    user = models.ForeignKey("api.User", related_name="replies", on_delete=models.CASCADE)
    rating = models.ForeignKey(Rating, related_name="replies", on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Reply by {self.user.username} on {self.rating.id}"
