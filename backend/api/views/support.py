from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from api.models import Notification, Ticket, TicketMessage, User
from api.serializers import TicketMessageSerializer, TicketSerializer


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return (
                Ticket.objects.all()
                .prefetch_related("messages", "messages__user")
                .order_by("-updated_at")
            )
        return (
            Ticket.objects.filter(user=self.request.user)
            .prefetch_related("messages", "messages__user")
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        ticket = serializer.save(user=self.request.user)
        admins = User.objects.filter(is_superuser=True).exclude(pk=self.request.user.pk)
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                actor=self.request.user,
                notification_type="ticket_new",
                ticket=ticket,
            )

    @action(detail=True, methods=["post"])
    def add_message(self, request: Request, pk=None) -> Response:
        ticket = self.get_object()
        text = request.data.get("text")
        if not text:
            return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)

        msg = TicketMessage.objects.create(ticket=ticket, user=request.user, text=text)

        if request.user.is_superuser:
            if ticket.user != request.user:
                Notification.objects.create(
                    recipient=ticket.user,
                    actor=request.user,
                    notification_type="ticket_reply",
                    ticket=ticket,
                )
        else:
            admins = User.objects.filter(is_superuser=True).exclude(pk=request.user.pk)
            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    actor=request.user,
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
