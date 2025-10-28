from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from .views import (
    RegisterView,
    CookieLoginView as LoginView,
    UserDetailView,
    UserProfileUpdateView,
    CookieRefreshView as TokenRefreshAllowAny,
    LogoutView,
    CsrfView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', csrf_exempt(LoginView.as_view()), name='token_obtain_pair'),
    path('refresh/', csrf_exempt(TokenRefreshAllowAny.as_view()), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('csrf/', CsrfView.as_view(), name='csrf'),
    path('profile/', UserDetailView.as_view(), name='profile'),
    path('profile/update/', UserProfileUpdateView.as_view(), name='profile_update'),
]

from django.urls import path
from .views import GoogleAuthView, GithubAuthView, GroupListView

urlpatterns += [
    path('auth/google/', csrf_exempt(GoogleAuthView.as_view()), name='google_auth'),
    path('auth/github/', csrf_exempt(GithubAuthView.as_view()), name='github_auth'),
    path('groups/', GroupListView.as_view(), name='groups_list'),
]