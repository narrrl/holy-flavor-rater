from typing import Any


def absolute_image_url(serializer: Any, image_field: Any) -> str | None:
    if not image_field:
        return None
    request = serializer.context.get("request")
    if request:
        return request.build_absolute_uri(image_field.url)
    return image_field.url
