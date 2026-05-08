from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    THEME_CHOICES = [
        ("holy_light", "Holy Light"),
        ("holy_dark", "Holy Dark"),
        ("latte", "Catppuccin Latte"),
        ("frappe", "Catppuccin Frappé"),
        ("macchiato", "Catppuccin Macchiato"),
        ("mocha", "Catppuccin Mocha"),
        ("pink_pastel", "Pink Pastel"),
        ("mint_pastel", "Mint Pastel"),
        ("lavender_pastel", "Lavender Pastel"),
        ("dracula", "Dracula"),
        ("nord", "Nordic Frost"),
        ("gruvbox", "Gruvbox Retro"),
        ("oceanic", "Oceanic Deep"),
        ("t0p_sai", "SAI (T0P)"),
        ("t0p_trench", "Trench (T0P)"),
        ("t0p_blurryface", "Blurryface (T0P)"),
        ("t0p_clancy", "Clancy (T0P)"),
    ]
    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("de", "Deutsch"),
    ]
    DRAWER_ANCHOR_CHOICES = [
        ("left", "Left"),
        ("right", "Right"),
    ]
    theme = models.CharField(max_length=20, choices=THEME_CHOICES, default="holy_light")
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default="en")
    drawer_anchor = models.CharField(max_length=5, choices=DRAWER_ANCHOR_CHOICES, default="right")
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    pending_email = models.EmailField(max_length=254, blank=True, null=True)
    email_confirmation_code = models.CharField(max_length=6, blank=True, null=True)
    following = models.ManyToManyField(
        "self", symmetrical=False, related_name="followers", blank=True
    )
    selected_banner = models.ForeignKey(
        "api.Banner",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.avatar:
            try:
                from PIL import Image

                img = Image.open(self.avatar.path)
                if img.height > 256 or img.width > 256 or img.format != "JPEG":
                    output_size = (256, 256)
                    img.thumbnail(output_size)
                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")
                    img.save(self.avatar.path, "JPEG", quality=90)
            except Exception:
                pass

    def __str__(self) -> str:
        return self.username


class UserIP(models.Model):
    user = models.ForeignKey(User, related_name="ips", on_delete=models.CASCADE)
    ip_address = models.GenericIPAddressField()
    last_login = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "ip_address")
        ordering = ["-last_login"]
