from django.core.exceptions import ObjectDoesNotExist
from rest_framework import permissions

class IsTeacher(permissions.BasePermission):
    """
    Faqat o'qituvchilarga ruxsat beradi.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            profile = request.user.profile
        except ObjectDoesNotExist:
            return False
        return getattr(profile, 'role', None) == 'teacher'
