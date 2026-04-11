import secrets
import string

from django.conf import settings
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from api.models import Banner, Flavor, Notification, ProfileComment, User
from api.serializers import (
    FlavorSerializer,
    NotificationSerializer,
    ProfileCommentSerializer,
    RatingSerializer,
    UserSerializer,
)
from api.services.ip_logging import log_user_ip
from api.tasks import send_email_task


def _generate_code() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in [
            "signup",
            "verify_signup",
            "request_password_reset",
            "complete_password_reset",
        ]:
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def following_list(self, request: Request) -> Response:
        following = request.user.following.all()
        return Response(self.get_serializer(following, many=True).data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    @method_decorator(ratelimit(key="ip", rate="5/h", method="POST", block=True))
    def signup(self, request: Request) -> Response:
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")
        if not username or not email or not password:
            return Response(
                {"error": "Username, email and password required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST
            )
        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        code = _generate_code()
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=False,
            email_confirmation_code=code,
        )

        verification_link = f"{settings.FRONTEND_URL}/verify-email?username={username}&code={code}"

        try:
            send_email_task.delay(
                subject="Verify your Holy Flavors account",
                message=(
                    f"Hi {username},\n\nYour verification code is: {code}\n\n"
                    f"Alternatively, you can complete your registration by clicking the link below:\n"
                    f"{verification_link}\n\nWelcome to the archive!"
                ),
                recipient_list=[email],
                from_email=settings.DEFAULT_FROM_EMAIL,
            )
        except Exception as e:
            user.delete()
            return Response(
                {
                    "error": (
                        f"Failed to send verification email. Please check your SMTP settings "
                        f"in the .env file. The server error was: {e}"
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "status": "User created, please verify your email",
                "username": username,
                "email": email,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def resend_verification(self, request: Request) -> Response:
        username = request.data.get("username")
        if not username:
            return Response({"error": "Username required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username, is_active=False)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or already active"},
                status=status.HTTP_404_NOT_FOUND,
            )

        code = _generate_code()
        user.email_confirmation_code = code
        user.save()

        verification_link = (
            f"{settings.FRONTEND_URL}/verify-email?username={user.username}&code={code}"
        )

        try:
            send_email_task.delay(
                subject="Verify your Holy Flavors account",
                message=(
                    f"Hi {user.username},\n\nYour new verification code is: {code}\n\n"
                    f"Alternatively, you can complete your registration by clicking the link below:\n"
                    f"{verification_link}"
                ),
                recipient_list=[user.email],
                from_email=settings.DEFAULT_FROM_EMAIL,
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to send email: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"status": "Verification code resent!"})

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def verify_signup(self, request: Request) -> Response:
        username = request.data.get("username")
        code = request.data.get("code")
        try:
            user = User.objects.get(username=username, is_active=False)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found or already active"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.email_confirmation_code == code:
            user.is_active = True
            user.email_confirmation_code = None
            user.save()
            return Response({"status": "Account verified successfully!"})
        return Response({"error": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[permissions.AllowAny],
        url_path="profile/(?P<username>[^/.]+)",
    )
    def public_profile(self, request: Request, username=None) -> Response:
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        ratings = user.ratings.select_related("flavor", "flavor__category").order_by("-score")
        comments = user.profile_comments.select_related("author").order_by("-created_at")

        followers = user.followers.all()
        following = user.following.all()

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "theme": user.theme,
                "avatar": (request.build_absolute_uri(user.avatar.url) if user.avatar else None),
                "following_count": following.count(),
                "followers_count": followers.count(),
                "is_following": (
                    request.user.following.filter(pk=user.pk).exists()
                    if request.user.is_authenticated
                    else False
                ),
                "ratings": RatingSerializer(ratings, many=True, context={"request": request}).data,
                "comments": ProfileCommentSerializer(
                    comments, many=True, context={"request": request}
                ).data,
                "followers": UserSerializer(
                    followers, many=True, context={"request": request}
                ).data,
                "following": UserSerializer(
                    following, many=True, context={"request": request}
                ).data,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def add_comment(self, request: Request, pk=None) -> Response:
        profile_owner = self.get_object()
        text = request.data.get("text")
        if not text:
            return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)

        comment = ProfileComment.objects.create(
            profile_owner=profile_owner,
            author=request.user,
            text=text,
        )

        if profile_owner != request.user:
            Notification.objects.create(
                recipient=profile_owner,
                actor=request.user,
                notification_type="profile_comment",
                profile_comment=comment,
            )

        return Response(
            ProfileCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path="delete_comment/(?P<comment_id>[^/.]+)",
        permission_classes=[permissions.IsAuthenticated],
    )
    def delete_comment(self, request: Request, pk=None, comment_id=None) -> Response:
        profile_owner = self.get_object()
        try:
            comment = ProfileComment.objects.get(pk=comment_id, profile_owner=profile_owner)
        except ProfileComment.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if (
            comment.author != request.user
            and not request.user.is_superuser
            and profile_owner != request.user
        ):
            return Response(status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def me(self, request: Request) -> Response:
        log_user_ip(request.user, request)
        return Response(self.get_serializer(request.user).data)

    @action(detail=False, methods=["patch"])
    def update_preferences(self, request: Request) -> Response:
        user = request.user
        theme = request.data.get("theme")
        language = request.data.get("language")
        banner_id = request.data.get("selected_banner")

        updated = False
        if theme in dict(User.THEME_CHOICES):
            user.theme = theme
            updated = True
        if language in dict(User.LANGUAGE_CHOICES):
            user.language = language
            updated = True

        if banner_id is not None:
            if banner_id == "":
                user.selected_banner = None
                updated = True
            else:
                try:
                    banner = Banner.objects.get(pk=banner_id, is_enabled=True)
                    user.selected_banner = banner
                    updated = True
                except Banner.DoesNotExist:
                    return Response(
                        {"error": "Invalid or disabled banner"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        if updated:
            user.save()
            return Response(
                {
                    "status": "preferences updated",
                    "theme": user.theme,
                    "language": user.language,
                    "selected_banner": (user.selected_banner.id if user.selected_banner else None),
                }
            )
        return Response({"error": "No valid updates provided"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def update_avatar(self, request: Request) -> Response:
        user = request.user
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"error": "No avatar provided"}, status=status.HTTP_400_BAD_REQUEST)

        if avatar.size > 2 * 1024 * 1024:
            return Response(
                {"error": "File size exceeds 2MB limit"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.avatar = avatar
        user.save()
        return Response(self.get_serializer(user).data)

    @action(detail=False, methods=["post"])
    def change_password(self, request: Request) -> Response:
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        if not user.check_password(old_password):
            return Response({"error": "Wrong old password"}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({"status": "password changed"})

    @action(detail=False, methods=["patch"])
    def update_profile(self, request: Request) -> Response:
        user = request.user
        username = request.data.get("username")
        email = request.data.get("email")

        message = ""
        if username and username != user.username:
            if User.objects.filter(username=username).exists():
                return Response(
                    {"error": "Username already taken"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.username = username

        if email and email != user.email:
            code = _generate_code()
            user.pending_email = email
            user.email_confirmation_code = code
            send_email_task.delay(
                subject="Confirm your new email",
                message=f"Hi {user.username},\n\nYour confirmation code is: {code}",
                recipient_list=[email],
                from_email=settings.DEFAULT_FROM_EMAIL,
            )
            message = " Confirmation code sent to new email."

        user.save()
        data = self.get_serializer(user).data
        if message:
            data["message"] = message
        return Response(data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request: Request, pk=None) -> Response:
        user_to_follow = self.get_object()
        if user_to_follow == request.user:
            return Response(
                {"error": "You cannot follow yourself"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.following.filter(pk=user_to_follow.pk).exists():
            request.user.following.add(user_to_follow)
            Notification.objects.create(
                recipient=user_to_follow,
                actor=request.user,
                notification_type="follow",
            )

        return Response({"status": "followed"})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def unfollow(self, request: Request, pk=None) -> Response:
        user_to_unfollow = self.get_object()
        request.user.following.remove(user_to_unfollow)
        return Response({"status": "unfollowed"})

    @action(detail=False, methods=["post"])
    def confirm_email(self, request: Request) -> Response:
        user = request.user
        code = request.data.get("code")
        if not user.email_confirmation_code or code != user.email_confirmation_code:
            return Response(
                {"error": "Invalid or expired code"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.email = user.pending_email
        user.pending_email = None
        user.email_confirmation_code = None
        user.save()
        return Response({"status": "Email confirmed", "email": user.email})

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    @method_decorator(ratelimit(key="ip", rate="3/h", method="POST", block=True))
    def request_password_reset(self, request: Request) -> Response:
        email = request.data.get("email")
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"status": "If an account exists with this email, a reset code has been sent."}
            )

        code = _generate_code()
        user.email_confirmation_code = code
        user.save()

        send_email_task.delay(
            subject="Password Reset Request",
            message=f"Hi {user.username},\n\nYour password reset code is: {code}",
            recipient_list=[email],
            from_email=settings.DEFAULT_FROM_EMAIL,
        )
        return Response(
            {"status": "If an account exists with this email, a reset code has been sent."}
        )

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    @method_decorator(ratelimit(key="ip", rate="5/h", method="POST", block=True))
    def complete_password_reset(self, request: Request) -> Response:
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("password")

        try:
            user = User.objects.get(email=email, email_confirmation_code=code)
        except User.DoesNotExist:
            return Response({"error": "Invalid email or code"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.email_confirmation_code = None
        user.save()
        return Response({"status": "Password reset successful!"})

    @action(detail=False, methods=["post"])
    @method_decorator(ratelimit(key="user", rate="3/h", method="POST", block=True))
    def request_account_deletion(self, request: Request) -> Response:
        code = _generate_code()
        user = request.user
        user.email_confirmation_code = code
        user.save()

        send_email_task.delay(
            subject="Confirm Account Deletion - Holy Flavors Archive",
            message=(
                f"Hi {user.username},\n\nYou requested to delete your account. "
                f"This action is permanent.\n\nYour deletion code is: {code}"
            ),
            recipient_list=[user.email],
            from_email=settings.DEFAULT_FROM_EMAIL,
        )
        return Response({"status": "Code sent to your email"})

    @action(detail=False, methods=["post"])
    def confirm_account_deletion(self, request: Request) -> Response:
        user = request.user
        code = request.data.get("code")
        if not user.email_confirmation_code or code != user.email_confirmation_code:
            return Response(
                {"error": "Invalid or expired code"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.delete()
        return Response({"status": "Account deleted"})

    @action(detail=False, methods=["get"])
    def dashboard(self, request: Request) -> Response:
        from django.db.models import Avg, Q

        user = request.user
        rated_ids = user.ratings.values_list("flavor_id", flat=True)
        followed_users = user.following.all()

        missing_flavors = (
            Flavor.objects.exclude(id__in=rated_ids)
            .exclude(category__name="Packs and other")
            .select_related("category")
            .annotate(
                average_rating=Avg("ratings__score"),
                followed_average_rating=Avg(
                    "ratings__score", filter=Q(ratings__user__in=followed_users)
                ),
            )
            .order_by("category__name", "name")
        )

        rated_flavors = (
            user.ratings.select_related("flavor", "flavor__category")
            .prefetch_related("replies", "replies__user")
            .order_by("-created_at")
        )

        return Response(
            {
                "user": UserSerializer(user).data,
                "rated_count": rated_flavors.count(),
                "missing_count": missing_flavors.count(),
                "missing_flavors": FlavorSerializer(
                    missing_flavors, many=True, context={"request": request}
                ).data,
                "my_ratings": RatingSerializer(
                    rated_flavors, many=True, context={"request": request}
                ).data,
            }
        )


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return self.request.user.notifications.select_related(
            "actor", "rating__flavor", "reply__rating__flavor"
        ).order_by("-created_at")

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request: Request) -> Response:
        request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({"status": "all read"})

    @action(detail=True, methods=["post"])
    def mark_read(self, request: Request, pk=None) -> Response:
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "marked read"})
