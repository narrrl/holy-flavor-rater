from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator

class User(AbstractUser):
    THEME_CHOICES = [
        ('holy_light', 'Holy Light'),
        ('holy_dark', 'Holy Dark'),
        ('latte', 'Catppuccin Latte'),
        ('frappe', 'Catppuccin Frappé'),
        ('macchiato', 'Catppuccin Macchiato'),
        ('mocha', 'Catppuccin Mocha'),
        ('pink_pastel', 'Pink Pastel'),
        ('mint_pastel', 'Mint Pastel'),
        ('lavender_pastel', 'Lavender Pastel'),
        ('dracula', 'Dracula'),
        ('nord', 'Nordic Frost'),
        ('gruvbox', 'Gruvbox Retro'),
        ('oceanic', 'Oceanic Deep'),
        ('t0p_sai', 'SAI (T0P)'),
        ('t0p_trench', 'Trench (T0P)'),
        ('t0p_blurryface', 'Blurryface (T0P)'),
        ('t0p_clancy', 'Clancy (T0P)'),
    ]
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('de', 'Deutsch'),
    ]
    theme = models.CharField(max_length=20, choices=THEME_CHOICES, default='holy_light')
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default='en')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    pending_email = models.EmailField(max_length=254, blank=True, null=True)
    email_confirmation_code = models.CharField(max_length=6, blank=True, null=True)
    following = models.ManyToManyField('self', symmetrical=False, related_name='followers', blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.avatar:
            try:
                from PIL import Image
                img = Image.open(self.avatar.path)
                if img.height > 256 or img.width > 256 or img.format != 'JPEG':
                    output_size = (256, 256)
                    img.thumbnail(output_size)
                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")
                    img.save(self.avatar.path, 'JPEG', quality=90)
            except Exception:
                pass

    def __str__(self):
        return self.username

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class Flavor(models.Model):
    category = models.ForeignKey(Category, related_name='flavors', on_delete=models.CASCADE)
    name = models.CharField(max_length=100) # Removed unique=True here
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    image = models.ImageField(upload_to='flavors/', blank=True, null=True)
    shop_url = models.URLField(max_length=500, blank=True, null=True)
    is_available = models.BooleanField(default=True)
    is_legacy = models.BooleanField(default=False)
    external_id = models.BigIntegerField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # This allows "Erdbeere" in Iced Tea and "Erdbeere" in Milkshake
        constraints = [
            models.UniqueConstraint(fields=['name', 'category'], name='unique_flavor_name_per_category')
        ]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.category.name})"

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

class Notification(models.Model):
    TYPE_CHOICES = [
        ('reply', 'Reply'),
        ('mention', 'Mention'),
        ('ticket_new', 'New Ticket'),
        ('ticket_reply', 'Ticket Reply'),
        ('profile_comment', 'Profile Comment'),
    ]
    recipient = models.ForeignKey(User, related_name='notifications', on_delete=models.CASCADE)
    actor = models.ForeignKey(User, related_name='actions', on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    rating = models.ForeignKey(Rating, on_delete=models.CASCADE, null=True, blank=True)
    reply = models.ForeignKey(Reply, on_delete=models.CASCADE, null=True, blank=True)
    ticket = models.ForeignKey('Ticket', on_delete=models.CASCADE, null=True, blank=True)
    profile_comment = models.ForeignKey('ProfileComment', on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} for {self.recipient.username}"

class UserIP(models.Model):
    user = models.ForeignKey(User, related_name='ips', on_delete=models.CASCADE)
    ip_address = models.GenericIPAddressField()
    last_login = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'ip_address')
        ordering = ['-last_login']

class Ticket(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    user = models.ForeignKey(User, related_name='tickets', on_delete=models.CASCADE)
    subject = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

class TicketMessage(models.Model):
    ticket = models.ForeignKey(Ticket, related_name='messages', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

class ProfileComment(models.Model):
    profile_owner = models.ForeignKey(User, related_name='profile_comments', on_delete=models.CASCADE)
    author = models.ForeignKey(User, related_name='authored_profile_comments', on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class Banner(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=False)
    settings = models.JSONField(default=dict, blank=True)
    schema = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.is_active:
            # Deactivate other banners
            Banner.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
