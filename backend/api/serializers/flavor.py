from django.db.models import Count
from rest_framework import serializers

from api.models import Category, Flavor, Rating
from api.serializers._helpers import absolute_image_url, absolute_media_url
from api.serializers.rating import RatingSerializer


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class FlavorSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    followed_average_rating = serializers.FloatField(read_only=True)
    user_rating = serializers.SerializerMethodField()
    ratings = RatingSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    image_urls = serializers.SerializerMethodField()
    rating_distribution = serializers.SerializerMethodField()

    class Meta:
        model = Flavor
        fields = [
            "id",
            "name",
            "category",
            "category_name",
            "category_slug",
            "description",
            "average_rating",
            "followed_average_rating",
            "user_rating",
            "ratings",
            "image_url",
            "image_urls",
            "image",
            "is_available",
            "is_legacy",
            "shop_url",
            "rating_distribution",
        ]
        extra_kwargs = {"image": {"write_only": True}}

    def get_image_url(self, obj: Flavor) -> str | None:
        if obj.main_image_path:
            url = absolute_media_url(self, obj.main_image_path)
            if url:
                return url
        if obj.local_image_paths:
            url = absolute_media_url(self, obj.local_image_paths[0])
            if url:
                return url
        if obj.image:
            return absolute_image_url(self, obj.image)
        return obj.image_url

    def get_image_urls(self, obj: Flavor) -> list[str]:
        if obj.local_image_paths:
            urls = [absolute_media_url(self, p) for p in obj.local_image_paths]
            return [u for u in urls if u]
        legacy_urls: list[str] = []
        if obj.image:
            absolute = absolute_image_url(self, obj.image)
            if absolute:
                legacy_urls.append(absolute)
        legacy_urls.extend(obj.image_urls or [])
        return legacy_urls

    def get_rating_distribution(self, obj: Flavor) -> dict[str, int]:
        counts = dict.fromkeys((str(i) for i in range(1, 11)), 0)
        for row in obj.ratings.values("score").annotate(c=Count("id")):
            score = row["score"]
            if 1 <= score <= 10:
                counts[str(score)] = row["c"]
        return counts

    def get_user_rating(self, obj: Flavor) -> int | None:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            try:
                return request.user.ratings.get(flavor=obj).score
            except Rating.DoesNotExist:
                return None
        return None
