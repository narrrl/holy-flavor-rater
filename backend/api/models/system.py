from django.db import models


class Banner(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(
        default=False, help_text="Designates this as the global default banner."
    )
    is_enabled = models.BooleanField(default=True, help_text="Allows users to select this banner.")
    settings = models.JSONField(default=dict, blank=True)
    schema = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.is_active:
            Banner.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        elif not Banner.objects.filter(is_active=True).exclude(pk=self.pk).exists():
            self.is_active = True
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class SystemConfig(models.Model):
    """Singleton model for application-wide settings editable via UI."""

    site_name = models.CharField(max_length=100, default="Holy Flavors Archive")
    maintenance_mode = models.BooleanField(default=False)
    allow_new_signups = models.BooleanField(default=True)
    require_email_verification = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Configuration"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> "SystemConfig":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Job(models.Model):
    """Tracks background jobs, their status and scheduling."""

    JOB_TYPES = [
        ("sync_flavors", "Sync Holy Flavors"),
        ("cleanup_duplicates", "Cleanup Duplicate Flavors"),
        ("backup_db", "Database Backup"),
        ("seed_legacy", "Seed Legacy Data"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    name = models.CharField(max_length=100, choices=JOB_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    last_run = models.DateTimeField(null=True, blank=True)
    next_run = models.DateTimeField(null=True, blank=True)
    interval_hours = models.IntegerField(default=0, help_text="Set to 0 to disable periodic run.")

    last_output = models.TextField(blank=True)
    error_message = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.get_name_display()} ({self.status})"
