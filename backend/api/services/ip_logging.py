from rest_framework.request import Request

from api.models import User, UserIP


def log_user_ip(user: User, request: Request) -> None:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")

    if ip and user.is_authenticated:
        UserIP.objects.update_or_create(user=user, ip_address=ip)
