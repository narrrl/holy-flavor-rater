from rest_framework import serializers

from api.models import Category, Flavor, Rating
from api.serializers._helpers import absolute_image_url
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
            "image",
            "is_available",
            "is_legacy",
            "shop_url",
        ]
        extra_kwargs = {"image": {"write_only": True}}

    def get_image_url(self, obj: Flavor) -> str | None:
        if obj.image:
            return absolute_image_url(self, obj.image)
        return obj.image_url

    def get_user_rating(self, obj: Flavor) -> int | None:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            try:
                return request.user.ratings.get(flavor=obj).score
            except Rating.DoesNotExist:
                return None
        return None
