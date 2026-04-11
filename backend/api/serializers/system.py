from rest_framework import serializers

from api.models import Banner, Job, SystemConfig


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = [
            "site_name",
            "maintenance_mode",
            "allow_new_signups",
            "require_email_verification",
            "updated_at",
        ]


class JobSerializer(serializers.ModelSerializer):
    name_display = serializers.CharField(source="get_name_display", read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "name",
            "name_display",
            "status",
            "last_run",
            "next_run",
            "interval_hours",
            "last_output",
            "error_message",
        ]
        read_only_fields = [
            "status",
            "last_run",
            "next_run",
            "last_output",
            "error_message",
        ]


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "is_enabled",
            "settings",
            "schema",
            "created_at",
            "updated_at",
        ]
