from rest_framework import serializers

from api.models import User, UserIP
from api.serializers._helpers import absolute_image_url
from api.serializers.rating import RatingSerializer


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    following_count = serializers.IntegerField(source="following.count", read_only=True)
    followers_count = serializers.IntegerField(source="followers.count", read_only=True)
    is_following = serializers.SerializerMethodField()
    unread_notifications_count = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)
    selected_banner_slug = serializers.CharField(
        source="selected_banner.slug", read_only=True, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "theme",
            "language",
            "drawer_anchor",
            "avatar",
            "following_count",
            "followers_count",
            "is_following",
            "unread_notifications_count",
            "is_superuser",
            "selected_banner",
            "selected_banner_slug",
        ]

    def get_avatar(self, obj: User) -> str | None:
        return absolute_image_url(self, obj.avatar)

    def get_is_following(self, obj: User) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return request.user.following.filter(pk=obj.pk).exists()
        return False

    def get_unread_notifications_count(self, obj: User) -> int:
        return obj.notifications.filter(is_read=False).count()


class UserIPSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserIP
        fields = ["id", "ip_address", "last_login"]


class AdminUserListSerializer(serializers.ModelSerializer):
    ips = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",
            "is_superuser",
            "date_joined",
            "last_login",
            "ips",
        ]

    def get_ips(self, obj: User) -> list[str]:
        return [ip.ip_address for ip in obj.ips.all()[:3]]


class AdminUserDetailSerializer(serializers.ModelSerializer):
    ips = serializers.SerializerMethodField()
    ratings = RatingSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",
            "is_superuser",
            "date_joined",
            "last_login",
            "ips",
            "ratings",
        ]

    def get_ips(self, obj: User) -> list[str]:
        return [ip.ip_address for ip in obj.ips.all()]
