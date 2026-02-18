from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Q
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from rest_framework.pagination import PageNumberPagination
from .models import User, Flavor, Category, Rating, Reply, Notification, Ticket, TicketMessage, UserIP, ProfileComment
from .serializers import (
    UserSerializer, FlavorSerializer, CategorySerializer, RatingSerializer, 
    ReplySerializer, NotificationSerializer, TicketSerializer, 
    TicketMessageSerializer, AdminUserListSerializer, AdminUserDetailSerializer,
    ProfileCommentSerializer
)

def log_user_ip(user, request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    
    if ip and user.is_authenticated:
        UserIP.objects.update_or_create(user=user, ip_address=ip)

def parse_mentions(text, actor, rating=None, reply=None):
    import re
    mentions = re.findall(r'@(\w+)', text)
    for username in set(mentions):
        try:
            recipient = User.objects.get(username__iexact=username)
            if recipient != actor:
                Notification.objects.get_or_create(
                    recipient=recipient,
                    actor=actor,
                    notification_type='mention',
                    rating=rating,
                    reply=reply
                )
        except User.DoesNotExist:
            continue

class FeedPagination(PageNumberPagination):
    page_size = 10

class FlavorViewSet(viewsets.ModelViewSet):
    queryset = Flavor.objects.annotate(average_rating=Avg('ratings__score')).order_by('-average_rating')
    serializer_class = FlavorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'category__slug']
    search_fields = ['name', 'description']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Flavor.objects.select_related('category').annotate(average_rating=Avg('ratings__score')).order_by('-average_rating').distinct()
        
        # Handle category keywords in search query for main results too
        search_query = self.request.query_params.get('search', '').lower().strip()
        if search_query:
            cat_keywords = {
                'iced tea': 'iced-tea',
                'eistee': 'iced-tea',
                'energy': 'energy',
                'hydration': 'hydration',
                'milkshake': 'milkshake'
            }
            for keyword, slug in cat_keywords.items():
                if keyword in search_query:
                    qs = qs.filter(category__slug=slug)
                    break # Only one category at a time
        
        return qs

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def search(self, request):
        query = request.query_params.get('q', '').lower().strip()
        if not query:
            return Response([])

        # Start with all flavors
        flavors = Flavor.objects.select_related('category').distinct()

        # Intelligent category filtering based on keywords
        cat_keywords = {
            'iced tea': 'iced-tea',
            'eistee': 'iced-tea',
            'energy': 'energy',
            'hydration': 'hydration',
            'milkshake': 'milkshake'
        }

        active_cat_slug = None
        remaining_query = query
        for keyword, slug in cat_keywords.items():
            if keyword in query:
                active_cat_slug = slug
                remaining_query = remaining_query.replace(keyword, '').strip()
                break
        
        if active_cat_slug:
            flavors = flavors.filter(category__slug=active_cat_slug)
        
        # Filter by remaining query words in name or description
        if remaining_query:
            words = remaining_query.split()
            for word in words:
                flavors = flavors.filter(
                    Q(name__icontains=word) | Q(description__icontains=word)
                )

        # Limit results for performance
        results = []
        for f in flavors.order_by('name')[:15]:
            results.append({
                'id': f.id,
                'name': f.name,
                'type': 'flavor',
                'subtitle': f.category.name,
                'image_url': request.build_absolute_uri(f.image.url) if f.image else f.image_url,
                'slug': None
            })

        return Response(results)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def top(self, request):
        top_flavors = self.get_queryset().filter(ratings__isnull=False).distinct()[:10]
        serializer = self.get_serializer(top_flavors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def newest(self, request):
        # Get the 10 newest flavors
        newest_flavors = Flavor.objects.select_related('category').order_by('-created_at')[:10]
        serializer = self.get_serializer(newest_flavors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def followed_top(self, request):
        followed_users = request.user.following.all()
        top_flavors = Flavor.objects.filter(ratings__user__in=followed_users) \
            .annotate(average_rating=Avg('ratings__score')) \
            .order_by('-average_rating') \
            .distinct()[:10]
        serializer = self.get_serializer(top_flavors, many=True)
        return Response(serializer.data)

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @method_decorator(ratelimit(key='user', rate='10/m', method='POST', block=True))
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Ensure user can only have one rating per flavor
        flavor = serializer.validated_data['flavor']
        if Rating.objects.filter(user=self.request.user, flavor=flavor).exists():
             raise serializers.ValidationError('You have already rated this flavor.')
        rating = serializer.save(user=self.request.user)
        # Parse mentions in the rating comment
        if rating.comment:
            parse_mentions(rating.comment, self.request.user, rating=rating)

    def get_queryset(self):
        return Rating.objects.select_related('user', 'flavor', 'flavor__category').prefetch_related('replies', 'replies__user').order_by('-created_at')

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def feed(self, request):
        # Get ratings from people the user follows
        followed_users = request.user.following.all()
        feed_ratings = Rating.objects.filter(user__in=followed_users).select_related('user', 'flavor', 'flavor__category').prefetch_related('replies', 'replies__user').order_by('-created_at')
        
        paginator = FeedPagination()
        page = paginator.paginate_queryset(feed_ratings, request)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = self.get_serializer(feed_ratings, many=True)
        return Response(serializer.data)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ['PUT', 'PATCH', 'DELETE'] and obj.user != request.user and not request.user.is_superuser:
            self.permission_denied(request, message='You cannot edit/delete this rating.')

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def recent(self, request):
        recent_ratings = Rating.objects.filter(comment__isnull=False).exclude(comment='').select_related('user', 'flavor').order_by('-created_at')[:10]
        serializer = self.get_serializer(recent_ratings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reply(self, request, pk=None):
        rating = self.get_object()
        text = request.data.get('text')
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        reply = Reply.objects.create(user=request.user, rating=rating, text=text)
        
        # Notify the rating author if it's not the same person
        if rating.user != request.user:
            Notification.objects.create(
                recipient=rating.user,
                actor=request.user,
                notification_type='reply',
                rating=rating,
                reply=reply
            )
            
        # Parse mentions in the reply text
        parse_mentions(text, request.user, rating=rating, reply=reply)
        
        return Response(ReplySerializer(reply, context={'request': request}).data, status=status.HTTP_201_CREATED)

class ReplyViewSet(viewsets.ModelViewSet):
    queryset = Reply.objects.all()
    serializer_class = ReplySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reply.objects.select_related('user', 'rating').order_by('created_at')

    def perform_update(self, serializer):
        reply = self.get_object()
        if reply.user != self.request.user and not self.request.user.is_superuser:
            raise permissions.PermissionDenied("You cannot edit this reply.")
        new_reply = serializer.save()
        # Parse mentions in the updated text
        parse_mentions(new_reply.text, self.request.user, rating=new_reply.rating, reply=new_reply)

    def perform_destroy(self, instance):
        if instance.user != self.request.user and not self.request.user.is_superuser:
            raise permissions.PermissionDenied("You cannot delete this reply.")
        instance.delete()

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return self.request.user.notifications.select_related('actor', 'rating__flavor', 'reply__rating__flavor').order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({'status': 'all read'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked read'})

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['signup', 'verify_signup', 'request_password_reset', 'complete_password_reset']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def following_list(self, request):
        following = request.user.following.all()
        serializer = self.get_serializer(following, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    @method_decorator(ratelimit(key='ip', rate='5/h', method='POST', block=True))
    def signup(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        if not username or not email or not password:
            return Response({'error': 'Username, email and password required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        import secrets
        import string
        code = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        user = User.objects.create_user(
            username=username, 
            email=email, 
            password=password,
            is_active=False,
            email_confirmation_code=code
        )
        
        try:
            send_mail(
                'Verify your Holy Flavors account',
                f'Hi {username},\n\nYour verification code is: {code}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
        except Exception as e:
            # If email fails for any reason, delete the user so they can try again
            user.delete()
            return Response(
                {'error': f'Failed to send verification email. Please check your SMTP settings in the .env file. The server error was: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({'status': 'User created, please verify your email'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verify_signup(self, request):
        username = request.data.get('username')
        code = request.data.get('code')
        try:
            user = User.objects.get(username=username, is_active=False)
        except User.DoesNotExist:
            return Response({'error': 'User not found or already active'}, status=status.HTTP_404_NOT_FOUND)
            
        if user.email_confirmation_code == code:
            user.is_active = True
            user.email_confirmation_code = None
            user.save()
            return Response({'status': 'Account verified successfully!'})
        else:
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='profile/(?P<username>[^/.]+)')
    def public_profile(self, request, username=None):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
        ratings = user.ratings.select_related('flavor', 'flavor__category').order_by('-score')
        comments = user.profile_comments.select_related('author').order_by('-created_at')
        
        followers = user.followers.all()
        following = user.following.all()
        
        return Response({
            'id': user.id,
            'username': user.username,
            'theme': user.theme,
            'avatar': request.build_absolute_uri(user.avatar.url) if user.avatar else None,
            'following_count': following.count(),
            'followers_count': followers.count(),
            'is_following': request.user.following.filter(pk=user.pk).exists() if request.user.is_authenticated else False,
            'ratings': RatingSerializer(ratings, many=True, context={'request': request}).data,
            'comments': ProfileCommentSerializer(comments, many=True, context={'request': request}).data,
            'followers': UserSerializer(followers, many=True, context={'request': request}).data,
            'following': UserSerializer(following, many=True, context={'request': request}).data
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_comment(self, request, pk=None):
        profile_owner = self.get_object()
        text = request.data.get('text')
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        comment = ProfileComment.objects.create(
            profile_owner=profile_owner,
            author=request.user,
            text=text
        )

        # Notify profile owner
        if profile_owner != request.user:
            Notification.objects.create(
                recipient=profile_owner,
                actor=request.user,
                notification_type='profile_comment',
                profile_comment=comment
            )

        return Response(ProfileCommentSerializer(comment, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='delete_comment/(?P<comment_id>[^/.]+)', permission_classes=[permissions.IsAuthenticated])
    def delete_comment(self, request, pk=None, comment_id=None):
        profile_owner = self.get_object()
        try:
            comment = ProfileComment.objects.get(pk=comment_id, profile_owner=profile_owner)
        except ProfileComment.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        if comment.author != request.user and not request.user.is_superuser and profile_owner != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def me(self, request):
        log_user_ip(request.user, request)
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_preferences(self, request):
        user = request.user
        theme = request.data.get('theme')
        language = request.data.get('language')
        
        updated = False
        if theme in dict(User.THEME_CHOICES):
            user.theme = theme
            updated = True
        if language in dict(User.LANGUAGE_CHOICES):
            user.language = language
            updated = True
            
        if updated:
            user.save()
            return Response({'status': 'preferences updated', 'theme': user.theme, 'language': user.language})
        return Response({'error': 'No valid updates provided'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def update_avatar(self, request):
        user = request.user
        avatar = request.FILES.get('avatar')
        if not avatar:
            return Response({'error': 'No avatar provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check size (2MB = 2 * 1024 * 1024 bytes)
        if avatar.size > 2 * 1024 * 1024:
            return Response({'error': 'File size exceeds 2MB limit'}, status=status.HTTP_400_BAD_REQUEST)
            
        user.avatar = avatar
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not user.check_password(old_password):
            return Response({'error': 'Wrong old password'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'status': 'password changed'})

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        user = request.user
        username = request.data.get('username')
        email = request.data.get('email')
        
        message = ""
        if username and username != user.username:
            if User.objects.filter(username=username).exists():
                return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)
            user.username = username
            
        if email and email != user.email:
            import secrets
            import string
            code = ''.join(secrets.choice(string.digits) for _ in range(6))
            user.pending_email = email
            user.email_confirmation_code = code
            send_mail(
                'Confirm your new email',
                f'Hi {user.username},\n\nYour confirmation code is: {code}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            message = " Confirmation code sent to new email."
            
        user.save()
        serializer = self.get_serializer(user)
        data = serializer.data
        if message:
            data['message'] = message
        return Response(data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request, pk=None):
        user_to_follow = self.get_object()
        if user_to_follow == request.user:
            return Response({'error': 'You cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.following.add(user_to_follow)
        return Response({'status': 'followed'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unfollow(self, request, pk=None):
        user_to_unfollow = self.get_object()
        request.user.following.remove(user_to_unfollow)
        return Response({'status': 'unfollowed'})

    @action(detail=False, methods=['post'])
    def confirm_email(self, request):
        user = request.user
        code = request.data.get('code')
        if not user.email_confirmation_code or code != user.email_confirmation_code:
            return Response({'error': 'Invalid or expired code'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.email = user.pending_email
        user.pending_email = None
        user.email_confirmation_code = None
        user.save()
        return Response({'status': 'Email confirmed', 'email': user.email})

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    @method_decorator(ratelimit(key='ip', rate='3/h', method='POST', block=True))
    def request_password_reset(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({'status': 'If an account exists with this email, a reset code has been sent.'})
            
        import secrets
        import string
        code = ''.join(secrets.choice(string.digits) for _ in range(6))
        user.email_confirmation_code = code
        user.save()
        
        send_mail(
            'Password Reset Request',
            f'Hi {user.username},\n\nYour password reset code is: {code}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return Response({'status': 'If an account exists with this email, a reset code has been sent.'})

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    @method_decorator(ratelimit(key='ip', rate='5/h', method='POST', block=True))
    def complete_password_reset(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('password')
        
        try:
            user = User.objects.get(email=email, email_confirmation_code=code)
        except User.DoesNotExist:
            return Response({'error': 'Invalid email or code'}, status=status.HTTP_400_BAD_REQUEST)
            
        user.set_password(new_password)
        user.email_confirmation_code = None
        user.save()
        return Response({'status': 'Password reset successful!'})

    @action(detail=False, methods=['post'])
    @method_decorator(ratelimit(key='user', rate='3/h', method='POST', block=True))
    def request_account_deletion(self, request):
        import secrets
        import string
        code = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        user = request.user
        user.email_confirmation_code = code
        user.save()
        
        send_mail(
            'Confirm Account Deletion - Holy Flavors Archive',
            f'Hi {user.username},\n\nYou requested to delete your account. This action is permanent.\n\nYour deletion code is: {code}',
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        return Response({'status': 'Code sent to your email'})

    @action(detail=False, methods=['post'])
    def confirm_account_deletion(self, request):
        user = request.user
        code = request.data.get('code')
        if not user.email_confirmation_code or code != user.email_confirmation_code:
            return Response({'error': 'Invalid or expired code'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.delete()
        return Response({'status': 'Account deleted'})

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        user = request.user
        rated_ids = user.ratings.values_list('flavor_id', flat=True)
        followed_users = user.following.all()
        
        # Missing flavors with community avg and followed circle avg
        missing_flavors = Flavor.objects.exclude(id__in=rated_ids) \
            .select_related('category') \
            .annotate(
                average_rating=Avg('ratings__score'),
                followed_average_rating=Avg('ratings__score', filter=Q(ratings__user__in=followed_users))
            ).order_by('category__name', 'name')
            
        rated_flavors = user.ratings.select_related('flavor', 'flavor__category') \
            .prefetch_related('replies', 'replies__user') \
            .order_by('-created_at')
        
        return Response({
            'user': UserSerializer(user).data,
            'rated_count': rated_flavors.count(),
            'missing_count': missing_flavors.count(),
            'missing_flavors': FlavorSerializer(missing_flavors, many=True, context={'request': request}).data,
            'my_ratings': RatingSerializer(rated_flavors, many=True, context={'request': request}).data
        })
class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Ticket.objects.all().prefetch_related('messages', 'messages__user').order_by('-updated_at')
        return Ticket.objects.filter(user=self.request.user).prefetch_related('messages', 'messages__user').order_by('-updated_at')

    def perform_create(self, serializer):
        ticket = serializer.save(user=self.request.user)
        # Notify all superusers about new ticket
        admins = User.objects.filter(is_superuser=True).exclude(pk=self.request.user.pk)
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                actor=self.request.user,
                notification_type='ticket_new',
                ticket=ticket
            )

    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        ticket = self.get_object()
        text = request.data.get('text')
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        msg = TicketMessage.objects.create(ticket=ticket, user=request.user, text=text)
        
        # Notification logic
        if request.user.is_superuser:
            # Notify the user who opened the ticket
            if ticket.user != request.user:
                Notification.objects.create(
                    recipient=ticket.user,
                    actor=request.user,
                    notification_type='ticket_reply',
                    ticket=ticket
                )
        else:
            # Notify all superusers
            admins = User.objects.filter(is_superuser=True).exclude(pk=request.user.pk)
            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    actor=request.user,
                    notification_type='ticket_reply',
                    ticket=ticket
                )

        return Response(TicketMessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def update_status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(Ticket.STATUS_CHOICES):
            ticket.status = new_status
            ticket.save()
            return Response({'status': 'updated'})
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise permissions.PermissionDenied("Only admins can delete tickets.")
        return super().destroy(request, *args, **kwargs)

class AdminViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        return Response({
            'total_users': User.objects.count(),
            'total_ratings': Rating.objects.count(),
            'total_replies': Reply.objects.count(),
            'open_tickets': Ticket.objects.filter(status='open').count(),
            'email_config': {
                'host': getattr(settings, 'EMAIL_HOST', 'None'),
                'port': getattr(settings, 'EMAIL_PORT', 'None'),
                'use_tls': getattr(settings, 'EMAIL_USE_TLS', False),
                'use_ssl': getattr(settings, 'EMAIL_USE_SSL', False),
                'skip_verify': getattr(settings, 'EMAIL_SKIP_CERT_VERIFICATION', False),
            }
        })

    @action(detail=False, methods=['post'])
    def send_test_email(self, request):
        try:
            send_mail(
                'Holy Flavors Admin Test Email',
                f'This is a test email sent to {request.user.email} from the Holy Flavors Admin Interface.',
                settings.DEFAULT_FROM_EMAIL,
                [request.user.email],
                fail_silently=False,
            )
            return Response({'status': 'Test email sent!'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def users(self, request):
        users = User.objects.all().prefetch_related('ips').order_by('-date_joined')
        return Response(AdminUserListSerializer(users, many=True).data)

    @action(detail=True, methods=['get', 'patch', 'delete'])
    def user_detail(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            return Response(AdminUserDetailSerializer(user, context={'request': request}).data)
        elif request.method == 'PATCH':
            is_active = request.data.get('is_active')
            if is_active is not None:
                user.is_active = is_active
                user.save()
            return Response(AdminUserDetailSerializer(user, context={'request': request}).data)
        elif request.method == 'DELETE':
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
