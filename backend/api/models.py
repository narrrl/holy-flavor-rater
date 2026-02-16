from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator

class User(AbstractUser):
    THEME_CHOICES = [
        ('latte', 'Latte'),
        ('frappe', 'Frappé'),
        ('macchiato', 'Macchiato'),
        ('mocha', 'Mocha'),
        ('pink', 'Pastel Pink'),
    ]
    theme = models.CharField(max_length=20, choices=THEME_CHOICES, default='mocha')
    pending_email = models.EmailField(max_length=254, blank=True, null=True)
    email_confirmation_code = models.CharField(max_length=6, blank=True, null=True)

    def __str__(self):
        return self.username

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Flavor(models.Model):
    category = models.ForeignKey(Category, related_name='flavors', on_delete=models.CASCADE)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    image = models.ImageField(upload_to='flavors/', blank=True, null=True)
    shop_url = models.URLField(max_length=500, blank=True, null=True)
    is_available = models.BooleanField(default=True)
    is_legacy = models.BooleanField(default=False)
    external_id = models.BigIntegerField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def get_average_rating(self):
        ratings = self.ratings.all()
        if ratings.exists():
            return sum(r.score for r in ratings) / ratings.count()
        return 0.0

    @property
    def cached_image_url(self):
        if self.image:
            return self.image.url
        return self.image_url

class Rating(models.Model):
    user = models.ForeignKey(User, related_name='ratings', on_delete=models.CASCADE)
    flavor = models.ForeignKey(Flavor, related_name='ratings', on_delete=models.CASCADE)
    score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'flavor')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.flavor.name}: {self.score}"

class Reply(models.Model):
    user = models.ForeignKey(User, related_name='replies', on_delete=models.CASCADE)
    rating = models.ForeignKey(Rating, related_name='replies', on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Reply by {self.user.username} on {self.rating.id}"
