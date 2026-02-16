from rest_framework import serializers
from .models import User, Flavor, Category, Rating, Reply

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'theme']

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
    flavor_name = serializers.CharField(source='flavor.name', read_only=True)
    flavor_image = serializers.SerializerMethodField()
    replies = ReplySerializer(many=True, read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'flavor', 'flavor_name', 'flavor_image', 'score', 'comment', 'created_at', 'replies']

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
