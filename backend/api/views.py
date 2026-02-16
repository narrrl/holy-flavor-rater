from django.core.mail import send_mail
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from .models import User, Flavor, Category, Rating, Reply
from .serializers import UserSerializer, FlavorSerializer, CategorySerializer, RatingSerializer, ReplySerializer

class FlavorViewSet(viewsets.ModelViewSet):
    queryset = Flavor.objects.annotate(average_rating=Avg('ratings__score')).order_by('-average_rating')
    serializer_class = FlavorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'category__slug']
    search_fields = ['name', 'description']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Flavor.objects.select_related('category').annotate(average_rating=Avg('ratings__score')).order_by('-average_rating')

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def search(self, request):
        # Unpaginated list of all flavors for the search autocomplete
        flavors = Flavor.objects.select_related('category').order_by('name')
        data = [
            {
                'id': f.id,
                'name': f.name,
                'image_url': request.build_absolute_uri(f.image.url) if f.image else f.image_url,
                'category_name': f.category.name
            }
            for f in flavors
        ]
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def top(self, request):
        top_flavors = self.get_queryset().filter(ratings__isnull=False).distinct()[:10]
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
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            return Rating.objects.select_related('user', 'flavor').prefetch_related('replies', 'replies__user')
        # Allow users to see only their own ratings when editing/deleting? 
        # No, for detail views they need to find it. 
        # The permission class IsOwnerOrReadOnly (custom) would be better, 
        # but standard ViewSet logic handles "get_object" which we can protect.
        return Rating.objects.select_related('user', 'flavor').prefetch_related('replies', 'replies__user')

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ['PUT', 'PATCH', 'DELETE'] and obj.user != request.user:
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
        return Response(ReplySerializer(reply).data, status=status.HTTP_201_CREATED)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['signup', 'verify_signup', 'request_password_reset', 'complete_password_reset']:
            return [permissions.AllowAny()]
        return super().get_permissions()

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
                'noreply@holyflavors.com',
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
            
        ratings = user.ratings.select_related('flavor', 'flavor__category').exclude(flavor__category__slug='packs-and-other').order_by('-score')
        
        return Response({
            'username': user.username,
            'theme': user.theme,
            'avatar': request.build_absolute_uri(user.avatar.url) if user.avatar else None,
            'ratings': RatingSerializer(ratings, many=True, context={'request': request}).data
        })

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_theme(self, request):
        user = request.user
        theme = request.data.get('theme')
        if theme in dict(User.THEME_CHOICES):
            user.theme = theme
            user.save()
            return Response({'status': 'theme updated', 'theme': theme})
        return Response({'error': 'Invalid theme'}, status=status.HTTP_400_BAD_REQUEST)

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
                'noreply@holyflavors.com',
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
            'noreply@holyflavors.com',
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

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        user = request.user
        rated_ids = user.ratings.values_list('flavor_id', flat=True)
        missing_flavors = Flavor.objects.exclude(id__in=rated_ids).exclude(category__slug='packs-and-other').select_related('category')
        rated_flavors = user.ratings.select_related('flavor', 'flavor__category').exclude(flavor__category__slug='packs-and-other')
        
        return Response({
            'user': UserSerializer(user).data,
            'rated_count': rated_flavors.count(),
            'missing_count': missing_flavors.count(),
            'missing_flavors': FlavorSerializer(missing_flavors, many=True, context={'request': request}).data,
            'my_ratings': RatingSerializer(rated_flavors, many=True, context={'request': request}).data
        })
