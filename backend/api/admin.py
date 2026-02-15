from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Category, Flavor, Rating

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('theme',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('theme',)}),
    )

admin.site.register(User, CustomUserAdmin)
admin.site.register(Category)
admin.site.register(Flavor)
admin.site.register(Rating)
