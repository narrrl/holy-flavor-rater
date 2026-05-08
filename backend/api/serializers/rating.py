from rest_framework import serializers

from api.models import Rating, Reply
from api.serializers._helpers import absolute_image_url


class ReplySerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Reply
        fields = ["id", "user", "rating", "text", "created_at"]
        read_only_fields = ["rating"]


class RatingSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_avatar = serializers.SerializerMethodField()
    flavor_name = serializers.CharField(source="flavor.name", read_only=True)
    flavor_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="flavor.category.name", read_only=True)
    category_slug = serializers.CharField(source="flavor.category.slug", read_only=True)
    is_available = serializers.BooleanField(source="flavor.is_available", read_only=True)
    is_legacy = serializers.BooleanField(source="flavor.is_legacy", read_only=True)
    replies = ReplySerializer(many=True, read_only=True)

    class Meta:
        model = Rating
        fields = [
            "id",
            "user",
            "user_id",
            "user_avatar",
            "flavor",
            "flavor_name",
            "flavor_image",
            "category_name",
            "category_slug",
            "is_available",
            "is_legacy",
            "score",
            "comment",
            "created_at",
            "replies",
        ]

    def get_user_avatar(self, obj: Rating) -> str | None:
        return absolute_image_url(self, obj.user.avatar)

    def get_flavor_image(self, obj: Rating) -> str | None:
        if obj.flavor.image:
            return absolute_image_url(self, obj.flavor.image)
        return obj.flavor.image_url
