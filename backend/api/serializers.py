from rest_framework import serializers
from .models import User, Flavor, Category, Rating, Reply, Notification

class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    following_count = serializers.IntegerField(source='following.count', read_only=True)
    followers_count = serializers.IntegerField(source='followers.count', read_only=True)
    is_following = serializers.SerializerMethodField()
    unread_notifications_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'theme', 'language', 'avatar', 'following_count', 'followers_count', 'is_following', 'unread_notifications_count']

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.following.filter(pk=obj.pk).exists()
        return False

    def get_unread_notifications_count(self, obj):
        return obj.notifications.filter(is_read=False).count()

class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    actor_avatar = serializers.SerializerMethodField()
    flavor_name = serializers.SerializerMethodField()
    flavor_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'actor_username', 'actor_avatar', 'notification_type', 'rating', 'reply', 'is_read', 'created_at', 'flavor_name', 'flavor_id']

    def get_actor_avatar(self, obj):
        if obj.actor.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.actor.avatar.url)
            return obj.actor.avatar.url
        return None

    def get_flavor_name(self, obj):
        if obj.rating:
            return obj.rating.flavor.name
        if obj.reply:
            return obj.reply.rating.flavor.name
        return None

    def get_flavor_id(self, obj):
        if obj.rating:
            return obj.rating.flavor.id
        if obj.reply:
            return obj.reply.rating.flavor.id
        return None

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class ReplySerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Reply
        fields = ['id', 'user', 'rating', 'text', 'created_at']
        read_only_fields = ['rating']

class RatingSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_avatar = serializers.SerializerMethodField()
    flavor_name = serializers.CharField(source='flavor.name', read_only=True)
    flavor_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='flavor.category.name', read_only=True)
    category_slug = serializers.CharField(source='flavor.category.slug', read_only=True)
    replies = ReplySerializer(many=True, read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'user_id', 'user_avatar', 'flavor', 'flavor_name', 'flavor_image', 'category_name', 'category_slug', 'score', 'comment', 'created_at', 'replies']

    def get_user_avatar(self, obj):
        if obj.user.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
            return obj.user.avatar.url
        return None

    def get_flavor_image(self, obj):
        if obj.flavor.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.flavor.image.url)
            return obj.flavor.image.url
        return obj.flavor.image_url

class FlavorSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    user_rating = serializers.SerializerMethodField()
    ratings = RatingSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Flavor
        fields = ['id', 'name', 'category', 'category_name', 'category_slug', 'description', 'average_rating', 'user_rating', 'ratings', 'image_url', 'is_available', 'is_legacy', 'shop_url']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.image_url

    def get_user_rating(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                rating = request.user.ratings.get(flavor=obj)
                return rating.score
            except Rating.DoesNotExist:
                return None
        return None
