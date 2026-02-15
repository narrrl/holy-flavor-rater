from rest_framework import serializers
from .models import User, Flavor, Category, Rating

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'theme']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class RatingSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    flavor_name = serializers.CharField(source='flavor.name', read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'flavor', 'flavor_name', 'score', 'comment', 'created_at']

class FlavorSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    user_rating = serializers.SerializerMethodField()
    ratings = RatingSerializer(many=True, read_only=True)

    class Meta:
        model = Flavor
        fields = ['id', 'name', 'category', 'category_name', 'description', 'average_rating', 'user_rating', 'ratings']

    def get_user_rating(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                rating = request.user.ratings.get(flavor=obj)
                return rating.score
            except Rating.DoesNotExist:
                return None
        return None
