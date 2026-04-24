from datetime import timedelta

from rest_framework import serializers

from api.models import Banner, Job, SystemConfig

_INTERVAL_PERIOD_TO_TIMEDELTA = {
    "days": lambda every: timedelta(days=every),
    "hours": lambda every: timedelta(hours=every),
    "minutes": lambda every: timedelta(minutes=every),
    "seconds": lambda every: timedelta(seconds=every),
}


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
    next_run = serializers.SerializerMethodField()

    def get_next_run(self, obj):
        from django_celery_beat.models import PeriodicTask

        task = PeriodicTask.objects.filter(name=f"job:{obj.name}", enabled=True).first()
        if not task or not task.interval:
            return None
        base = task.last_run_at or obj.last_run
        if not base:
            return None
        delta_fn = _INTERVAL_PERIOD_TO_TIMEDELTA.get(task.interval.period)
        if not delta_fn:
            return None
        return base + delta_fn(task.interval.every)

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
