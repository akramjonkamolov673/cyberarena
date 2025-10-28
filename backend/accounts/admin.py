from django.contrib import admin
from .models import UserProfile, Group


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name', 'description')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'role', 'group', 'rank', 'joined_at')
    list_filter = ('role', 'group', 'joined_at')
    search_fields = ('user__username', 'user__email', 'group__name')
