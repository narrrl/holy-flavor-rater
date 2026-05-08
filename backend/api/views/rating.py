from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from api.models import Notification, Rating, Reply
from api.serializers import RatingSerializer, ReplySerializer
from api.services.mentions import parse_mentions
from api.utils.auth import current_user
from api.views._pagination import FeedPagination


class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @method_decorator(ratelimit(key="user", rate="10/m", method="POST", block=True))
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        me = current_user(self.request)
        flavor = serializer.validated_data["flavor"]
        if Rating.objects.filter(user=me, flavor=flavor).exists():
            raise serializers.ValidationError("You have already rated this flavor.")
        rating = serializer.save(user=me)
        if rating.comment:
            parse_mentions(rating.comment, me, rating=rating)

    def get_queryset(self):
        return (
            Rating.objects.select_related("user", "flavor", "flavor__category")
            .prefetch_related("replies", "replies__user")
            .order_by("-created_at")
        )

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def feed(self, request: Request) -> Response:
        me = current_user(request)
        followed_users = me.following.all()
        feed_ratings = (
            Rating.objects.filter(user__in=followed_users)
            .select_related("user", "flavor", "flavor__category")
            .prefetch_related("replies", "replies__user")
            .order_by("-created_at")
        )

        paginator = FeedPagination()
        page = paginator.paginate_queryset(feed_ratings, request)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        return Response(self.get_serializer(feed_ratings, many=True).data)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if (
            request.method in ["PUT", "PATCH", "DELETE"]
            and obj.user != request.user
            and not request.user.is_superuser
        ):
            self.permission_denied(request, message="You cannot edit/delete this rating.")

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def recent(self, request: Request) -> Response:
        recent_ratings = (
            Rating.objects.filter(comment__isnull=False)
            .exclude(comment="")
            .select_related("user", "flavor")
            .order_by("-created_at")[:10]
        )
        return Response(self.get_serializer(recent_ratings, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def reply(self, request: Request, pk=None) -> Response:
        me = current_user(request)
        rating = self.get_object()
        text = request.data.get("text")
        if not text:
            return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)

        reply = Reply.objects.create(user=me, rating=rating, text=text)

        if rating.user != me:
            Notification.objects.create(
                recipient=rating.user,
                actor=me,
                notification_type="reply",
                rating=rating,
                reply=reply,
            )

        parse_mentions(text, me, rating=rating, reply=reply)

        return Response(
            ReplySerializer(reply, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ReplyViewSet(viewsets.ModelViewSet):
    queryset = Reply.objects.all()
    serializer_class = ReplySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reply.objects.select_related("user", "rating").order_by("created_at")

    def perform_update(self, serializer):
        me = current_user(self.request)
        reply = self.get_object()
        if reply.user != me and not me.is_superuser:
            raise PermissionDenied("You cannot edit this reply.")
        new_reply = serializer.save()
        parse_mentions(new_reply.text, me, rating=new_reply.rating, reply=new_reply)

    def perform_destroy(self, instance):
        me = current_user(self.request)
        if instance.user != me and not me.is_superuser:
            raise PermissionDenied("You cannot delete this reply.")
        instance.delete()
