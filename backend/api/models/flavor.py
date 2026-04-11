from django.db import models
from django.db.models import Avg


class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Flavor(models.Model):
    category = models.ForeignKey(Category, related_name="flavors", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    image_urls = models.JSONField(blank=True, default=list)
    image = models.ImageField(upload_to="flavors/", blank=True, null=True)
    shop_url = models.URLField(max_length=500, blank=True, null=True)
    is_available = models.BooleanField(default=True)
    is_legacy = models.BooleanField(default=False)
    external_id = models.BigIntegerField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "category"],
                name="unique_flavor_name_per_category",
            )
        ]
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.category.name})"

    @property
    def get_average_rating(self) -> float:
        result = self.ratings.aggregate(avg=Avg("score"))["avg"]
        return result or 0.0

    @property
    def cached_image_url(self) -> str | None:
        if self.image:
            return self.image.url
        return self.image_url
