from rest_framework import serializers

from api.models import Ticket, TicketMessage
from api.serializers._helpers import absolute_image_url


class TicketMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    is_admin = serializers.BooleanField(source="user.is_superuser", read_only=True)

    class Meta:
        model = TicketMessage
        fields = ["id", "username", "text", "created_at", "is_admin"]


class TicketSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_avatar = serializers.SerializerMethodField()
    messages = TicketMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "user",
            "username",
            "user_email",
            "user_avatar",
            "subject",
            "description",
            "status",
            "created_at",
            "updated_at",
            "messages",
        ]
        read_only_fields = ["status", "user"]

    def get_user_avatar(self, obj: Ticket) -> str | None:
        return absolute_image_url(self, obj.user.avatar)
