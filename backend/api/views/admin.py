import json
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from api.models import Flavor, Job, Rating, Reply, SystemConfig, Ticket, User
from api.services.flavor import merge_flavors
from api.serializers import (
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    JobSerializer,
    SystemConfigSerializer,
)
from api.tasks import (
    backup_db_task,
    cleanup_duplicates_task,
    seed_banners_task,
    seed_legacy_task,
    sync_flavors_task,
)
from api.utils.auth import current_user

# Maps Job.name → (celery task name for beat schedules, callable for direct dispatch).
# Direct callables let .delay() honor CELERY_TASK_ALWAYS_EAGER in dev.
JOB_TASKS: dict[str, tuple[str, Any]] = {
    "sync_flavors": ("api.sync_flavors", sync_flavors_task),
    "cleanup_duplicates": ("api.cleanup_duplicates", cleanup_duplicates_task),
    "backup_db": ("api.backup_db", backup_db_task),
    "seed_legacy": ("api.seed_legacy", seed_legacy_task),
    "seed_banners": ("api.seed_banners", seed_banners_task),
}

JOB_TASK_MAP = {name: meta[0] for name, meta in JOB_TASKS.items()}


def _sync_periodic_task(job: Job) -> None:
    """Create/update a django_celery_beat PeriodicTask for this Job.

    Called when the admin changes interval_hours. interval_hours == 0 disables
    the schedule (PeriodicTask.enabled=False).
    """
    from django_celery_beat.models import IntervalSchedule, PeriodicTask

    task_name = JOB_TASK_MAP.get(job.name)
    if not task_name:
        return

    periodic_name = f"job:{job.name}"

    if job.interval_hours <= 0:
        PeriodicTask.objects.filter(name=periodic_name).update(enabled=False)
        return

    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=job.interval_hours,
        period=IntervalSchedule.HOURS,
    )
    PeriodicTask.objects.update_or_create(
        name=periodic_name,
        defaults={
            "interval": schedule,
            "task": task_name,
            "enabled": True,
            "kwargs": json.dumps({}),
        },
    )


class AdminViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=["get"])
    def stats(self, request: Request) -> Response:
        return Response(
            {
                "total_users": User.objects.count(),
                "total_ratings": Rating.objects.count(),
                "total_replies": Reply.objects.count(),
                "open_tickets": Ticket.objects.filter(status="open").count(),
                "email_config": {
                    "host": getattr(settings, "EMAIL_HOST", "None"),
                    "port": getattr(settings, "EMAIL_PORT", "None"),
                    "use_tls": getattr(settings, "EMAIL_USE_TLS", False),
                    "use_ssl": getattr(settings, "EMAIL_USE_SSL", False),
                    "skip_verify": getattr(settings, "EMAIL_SKIP_CERT_VERIFICATION", False),
                },
                "server_info": {
                    "debug": settings.DEBUG,
                    "allowed_hosts": settings.ALLOWED_HOSTS,
                    "frontend_url": getattr(settings, "FRONTEND_URL", "Not set"),
                    "media_root": str(settings.MEDIA_ROOT),
                    "static_root": str(settings.STATIC_ROOT),
                },
            }
        )

    @action(detail=False, methods=["get", "patch"])
    def config(self, request: Request) -> Response:
        config = SystemConfig.get_solo()
        if request.method == "PATCH":
            serializer = SystemConfigSerializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        return Response(SystemConfigSerializer(config).data)

    @action(detail=False, methods=["get"])
    def jobs(self, request: Request) -> Response:
        for job_type, _ in Job.JOB_TYPES:
            Job.objects.get_or_create(name=job_type)

        jobs = Job.objects.all().order_by("name")
        return Response(JobSerializer(jobs, many=True).data)

    @action(detail=True, methods=["post"])
    def trigger_job(self, request: Request, pk=None) -> Response:
        try:
            job = Job.objects.get(pk=pk)
        except Job.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        meta = JOB_TASKS.get(job.name)
        if not meta:
            return Response(
                {"error": f"No celery task registered for {job.name}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task_name, task_fn = meta
        job.status = "pending"
        job.error_message = ""
        job.save(update_fields=["status", "error_message"])

        task_fn.delay()
        return Response({"status": "Job queued", "task": task_name})

    @action(detail=True, methods=["patch"])
    def update_job_schedule(self, request: Request, pk=None) -> Response:
        try:
            job = Job.objects.get(pk=pk)
        except Job.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        interval = request.data.get("interval_hours")
        if interval is not None:
            job.interval_hours = int(interval)
            job.save(update_fields=["interval_hours"])

        _sync_periodic_task(job)
        return Response(JobSerializer(job).data)

    @action(detail=False, methods=["post"])
    def merge_flavors(self, request: Request) -> Response:
        keep_id = request.data.get("keep_id")
        remove_id = request.data.get("remove_id")

        if not keep_id or not remove_id:
            return Response(
                {"error": "Both keep_id and remove_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            keep_flavor = Flavor.objects.get(pk=keep_id)
            remove_flavor = Flavor.objects.get(pk=remove_id)
        except Flavor.DoesNotExist:
            return Response(
                {"error": "One or both flavors not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if keep_flavor.category_id != remove_flavor.category_id:
            return Response(
                {"error": "Flavors must belong to the same category"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        merge_flavors(keep_flavor, remove_flavor)
        return Response({"status": "Flavors merged successfully"})

    @action(detail=False, methods=["post"])
    def send_test_email(self, request: Request) -> Response:
        me = current_user(request)
        try:
            send_mail(
                "Holy Flavors Admin Test Email",
                (f"This is a test email sent to {me.email} from the Holy Flavors Admin Interface."),
                settings.DEFAULT_FROM_EMAIL,
                [me.email],
                fail_silently=False,
            )
            return Response({"status": "Test email sent!"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"])
    def users(self, request: Request) -> Response:
        users = User.objects.all().prefetch_related("ips").order_by("-date_joined")
        return Response(AdminUserListSerializer(users, many=True).data)

    @action(detail=True, methods=["get", "patch", "delete"])
    def user_detail(self, request: Request, pk=None) -> Response:
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(AdminUserDetailSerializer(user, context={"request": request}).data)
        elif request.method == "PATCH":
            is_active = request.data.get("is_active")
            if is_active is not None:
                user.is_active = is_active
                user.save()
            return Response(AdminUserDetailSerializer(user, context={"request": request}).data)
        elif request.method == "DELETE":
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
