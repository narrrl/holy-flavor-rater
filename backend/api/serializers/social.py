from rest_framework import serializers

from api.models import Notification, ProfileComment
from api.serializers._helpers import absolute_image_url


class ProfileCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ProfileComment
        fields = ["id", "author_username", "author_avatar", "text", "created_at"]

    def get_author_avatar(self, obj: ProfileComment) -> str | None:
        return absolute_image_url(self, obj.author.avatar)


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    actor_avatar = serializers.SerializerMethodField()
    flavor_name = serializers.SerializerMethodField()
    flavor_id = serializers.SerializerMethodField()
    profile_owner_username = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "actor_username",
            "actor_avatar",
            "notification_type",
            "rating",
            "reply",
            "ticket",
            "profile_comment",
            "profile_owner_username",
            "is_read",
            "created_at",
            "flavor_name",
            "flavor_id",
        ]

    def get_actor_avatar(self, obj: Notification) -> str | None:
        return absolute_image_url(self, obj.actor.avatar)

    def get_flavor_name(self, obj: Notification) -> str | None:
        if obj.rating:
            return obj.rating.flavor.name
        if obj.reply:
            return obj.reply.rating.flavor.name
        return None

    def get_flavor_id(self, obj: Notification) -> int | None:
        if obj.rating:
            return obj.rating.flavor.id
        if obj.reply:
            return obj.reply.rating.flavor.id
        return None

    def get_profile_owner_username(self, obj: Notification) -> str | None:
        if obj.profile_comment:
            return obj.profile_comment.profile_owner.username
        return None
