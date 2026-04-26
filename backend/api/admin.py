from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Banner, Category, Flavor, Rating, User


class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + ((None, {"fields": ("theme",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + ((None, {"fields": ("theme",)}),)


class FlavorAdminForm(forms.ModelForm):
    class Meta:
        model = Flavor
        exclude: list[str] = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        instance = kwargs.get("instance")
        paths = list(instance.local_image_paths or []) if instance else []
        if paths:
            choices = [("", "— first available —")] + [(p, p.split("/")[-1]) for p in paths]
            self.fields["main_image_path"] = forms.ChoiceField(
                choices=choices,
                required=False,
                label="Main image",
                help_text="Pick which downloaded image is used as the primary.",
            )


class FlavorAdmin(admin.ModelAdmin):
    form = FlavorAdminForm
    list_display = ("name", "category", "is_available", "is_legacy", "external_id")
    list_filter = ("category", "is_available", "is_legacy")
    search_fields = ("name",)
    readonly_fields = ("local_image_paths",)


admin.site.register(User, CustomUserAdmin)
admin.site.register(Category)
admin.site.register(Flavor, FlavorAdmin)
admin.site.register(Rating)
admin.site.register(Banner)
