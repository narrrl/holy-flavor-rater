from typing import Any

from django.conf import settings


def absolute_image_url(serializer: Any, image_field: Any) -> str | None:
    if not image_field:
        return None
    request = serializer.context.get("request")
    if request:
        return request.build_absolute_uri(image_field.url)
    return image_field.url


def absolute_media_url(serializer: Any, rel_path: str | None) -> str | None:
    if not rel_path:
        return None
    media_url = settings.MEDIA_URL.rstrip("/") + "/"
    url = media_url + rel_path.lstrip("/")
    request = serializer.context.get("request")
    if request:
        return request.build_absolute_uri(url)
    return url
