from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from api.models import Banner, User
from api.serializers import BannerSerializer


class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_superuser:
            return Banner.objects.all()
        return Banner.objects.filter(is_enabled=True)

    def get_permissions(self):
        if self.action in ["list", "retrieve", "active"]:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=["get"])
    def active(self, request: Request) -> Response:
        username = request.query_params.get("username")
        user = None
        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                pass

        if not user and request.user.is_authenticated:
            user = request.user

        if user and user.selected_banner and user.selected_banner.is_enabled:
            return Response(self.get_serializer(user.selected_banner).data)

        active_banner = Banner.objects.filter(is_active=True).first()
        if active_banner:
            return Response(self.get_serializer(active_banner).data)
        return Response(None)

    @action(detail=True, methods=["post"])
    def activate(self, request: Request, pk=None) -> Response:
        banner = self.get_object()
        banner.is_active = True
        banner.is_enabled = True
        banner.save()
        return Response({"status": "banner set as global default"})

    @action(detail=True, methods=["post"])
    def toggle_enabled(self, request: Request, pk=None) -> Response:
        banner = self.get_object()
        if banner.is_active:
            return Response(
                {"error": "Cannot disable the global default banner."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        banner.is_enabled = not banner.is_enabled
        banner.save()
        return Response({"status": "enabled" if banner.is_enabled else "disabled"})
