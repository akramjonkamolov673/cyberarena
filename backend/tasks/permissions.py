from rest_framework import permissions

class IsTeacher(permissions.BasePermission):
    """
    Faqat o'qituvchilarga ruxsat beradi.
    """
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                hasattr(request.user, 'profile') and 
                getattr(request.user.profile, 'role', None) == 'teacher')
