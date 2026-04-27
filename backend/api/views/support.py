from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from api.models import Notification, Ticket, TicketMessage, User
from api.serializers import TicketMessageSerializer, TicketSerializer
from api.utils.auth import current_user


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Ticket.objects.none()
        me = current_user(self.request)
        if me.is_superuser:
            return (
                Ticket.objects.all()
                .prefetch_related("messages", "messages__user")
                .order_by("-updated_at")
            )
        return (
            Ticket.objects.filter(user=me)
            .prefetch_related("messages", "messages__user")
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        me = current_user(self.request)
        ticket = serializer.save(user=me)
        admins = User.objects.filter(is_superuser=True).exclude(pk=me.pk)
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                actor=me,
                notification_type="ticket_new",
                ticket=ticket,
            )

    @action(detail=True, methods=["post"])
    def add_message(self, request: Request, pk=None) -> Response:
        me = current_user(request)
        ticket = self.get_object()
        text = request.data.get("text")
        if not text:
            return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)

        msg = TicketMessage.objects.create(ticket=ticket, user=me, text=text)

        if me.is_superuser:
            if ticket.user != me:
                Notification.objects.create(
                    recipient=ticket.user,
                    actor=me,
                    notification_type="ticket_reply",
                    ticket=ticket,
                )
        else:
            admins = User.objects.filter(is_superuser=True).exclude(pk=me.pk)
            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    actor=me,
                    notification_type="ticket_reply",
                    ticket=ticket,
                )

        return Response(TicketMessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def update_status(self, request: Request, pk=None) -> Response:
        ticket = self.get_object()
        new_status = request.data.get("status")
        if new_status in dict(Ticket.STATUS_CHOICES):
            ticket.status = new_status
            ticket.save()
            return Response({"status": "updated"})
        return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied("Only admins can delete tickets.")
        return super().destroy(request, *args, **kwargs)
