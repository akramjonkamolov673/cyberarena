from rest_framework import generics, permissions, status, views
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .models import UserProfile, Group
from .serializers import RegisterSerializer, UserFullSerializer, GroupSerializer, EmailOrUsernameTokenObtainPairSerializer


# Ro‘yxatdan o‘tish
@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def create(self, request, *args, **kwargs):
        # Multipart qo'llab-quvvatlash: 'profile' JSON bo'lishi mumkin va avatar fayl sifatida kelsin
        data = request.data.copy()
        profile_payload = data.get('profile')
        if profile_payload and isinstance(profile_payload, str):
            import json
            try:
                profile_data = json.loads(profile_payload)
            except json.JSONDecodeError:
                profile_data = {}
        else:
            profile_data = profile_payload if isinstance(profile_payload, dict) else {}
        if 'avatar' in request.FILES:
            profile_data['avatar'] = request.FILES['avatar']
        if profile_data:
            data['profile'] = profile_data

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        })


# Login (JWT)
class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailOrUsernameTokenObtainPairSerializer


class TokenRefreshAllowAny(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


# --- Cookie-based JWT auth ---
from django.contrib.auth import authenticate
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


def _set_jwt_cookies(resp: Response, access: str, refresh: str):
    secure_flag = not settings.DEBUG
    samesite_val = 'Strict' if secure_flag else 'Lax'
    resp.set_cookie(
        'access', access,
        max_age=60*10, httponly=True, secure=secure_flag, samesite=samesite_val, path='/'
    )
    resp.set_cookie(
        'refresh', refresh,
        max_age=60*60*24*7, httponly=True, secure=secure_flag, samesite=samesite_val, path='/api/users/refresh/'
    )


def _clear_jwt_cookies(resp: Response):
    resp.delete_cookie('access', path='/')
    resp.delete_cookie('refresh', path='/api/users/refresh/')


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def get(self, request):
        return Response({'detail': 'ok'})


@method_decorator(csrf_exempt, name='dispatch')
class CookieLoginView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({'detail': 'username and password required'}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
        refresh = RefreshToken.for_user(user)
        resp = Response({'detail': 'ok'}, status=status.HTTP_200_OK)
        _set_jwt_cookies(resp, str(refresh.access_token), str(refresh))
        return resp


@method_decorator(csrf_exempt, name='dispatch')
class CookieRefreshView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def post(self, request):
        refresh_cookie = request.COOKIES.get('refresh')
        if not refresh_cookie:
            return Response({'detail': 'No refresh'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            token = RefreshToken(refresh_cookie)
            new_access = str(token.access_token)
        except Exception:
            return Response({'detail': 'Invalid refresh'}, status=status.HTTP_401_UNAUTHORIZED)
        resp = Response({'detail': 'refreshed'}, status=status.HTTP_200_OK)
        resp.set_cookie('access', new_access, max_age=60*10, httponly=True, secure=True, samesite='Strict', path='/')
        return resp


class LogoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        resp = Response({'detail': 'logged out'}, status=status.HTTP_200_OK)
        _clear_jwt_cookies(resp)
        return resp


# GET orqali User + Profile ma’lumotlarini olish
class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserFullSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# Profile yangilash
class UserProfileUpdateView(generics.UpdateAPIView):
    serializer_class = UserFullSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data.copy()
        profile_payload = data.get('profile')
        if profile_payload and isinstance(profile_payload, str):
            import json
            try:
                profile_data = json.loads(profile_payload)
            except json.JSONDecodeError:
                profile_data = {}
        else:
            profile_data = profile_payload if isinstance(profile_payload, dict) else {}
        if 'avatar' in request.FILES:
            profile_data['avatar'] = request.FILES['avatar']
        
        # User ma’lumotlarini yangilash
        if 'email' in request.data:
            user.email = request.data['email']
        if 'username' in request.data:
            user.username = request.data['username']
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        user.save()
        
        # Profile ma’lumotlarini yangilash
        profile = user.profile
        for key, value in profile_data.items():
            if hasattr(profile, key):
                if key == 'group' and isinstance(value, int):
                    try:
                        value = Group.objects.get(pk=value)
                    except Group.DoesNotExist:
                        value = None
                setattr(profile, key, value)
        profile.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)

import requests
from django.conf import settings
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import UserProfile, Group


@method_decorator(csrf_exempt, name='dispatch')
class GoogleAuthView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def post(self, request):
        """
        Supports two flows:
        - Token flow: body contains {"token": <google_access_token>}
        - Authorization code flow: body contains {"code": <authorization_code>}
        In code flow, we exchange the code for tokens using GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI
        """
        code = request.data.get("code")
        token = request.data.get("token")

        # If code is provided, exchange it for access_token
        if code and not token:
            if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
                return Response({"error": "Google OAuth is not configured on server"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            try:
                token_resp = requests.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "redirect_uri": getattr(settings, 'GOOGLE_REDIRECT_URI', ''),
                        "grant_type": "authorization_code",
                    },
                    timeout=10,
                )
            except requests.RequestException:
                return Response({"error": "Google bilan aloqa o'rnatib bo'lmadi"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            if token_resp.status_code != 200:
                return Response({"error": "Google code exchange failed"}, status=status.HTTP_400_BAD_REQUEST)
            token_data = token_resp.json()
            token = token_data.get("access_token")
            if not token:
                return Response({"error": "Google code exchange: no access_token"}, status=status.HTTP_400_BAD_REQUEST)

        if not token:
            return Response({"error": "Token or code is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch Google userinfo with access token
        try:
            google_response = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
        except requests.RequestException:
            return Response({"error": "Google bilan aloqa o'rnatib bo'lmadi"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if google_response.status_code != 200:
            return Response({"error": "Invalid Google token"}, status=status.HTTP_400_BAD_REQUEST)

        data = google_response.json()
        email = data.get("email")
        sub = data.get("sub")
        name = data.get("name", "User")
        given_name = data.get("given_name", "")
        family_name = data.get("family_name", "")

        # Find or create user by email, or fallback to google_<sub>
        user = None
        created = False
        if email:
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                user = User.objects.create(username=email, email=email)
                created = True
        else:
            if not sub:
                return Response({"error": "Google response malformed: no email or sub"}, status=status.HTTP_400_BAD_REQUEST)
            username = f"google_{sub}"
            user, created = User.objects.get_or_create(username=username, defaults={"email": f"{username}@example.com"})

        if created or not user.first_name:
            user.first_name = given_name or name
        if created or not user.last_name:
            user.last_name = family_name
        user.save()

        # Ensure profile exists
        UserProfile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        })


@method_decorator(csrf_exempt, name='dispatch')
class GithubAuthView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def post(self, request):
        code = request.data.get("code")

        if not code:
            return Response({"error": "Code is required"}, status=status.HTTP_400_BAD_REQUEST)

        # GitHub token olish
        try:
            payload = {
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            }
            redirect_uri = getattr(settings, 'GITHUB_REDIRECT_URI', '')
            if redirect_uri:
                payload["redirect_uri"] = redirect_uri
            token_response = requests.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data=payload,
                timeout=10,
            )
        except requests.RequestException:
            return Response({"error": "GitHub bilan aloqa o'rnatib bo'lmadi"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if token_response.status_code != 200:
            return Response({"error": "Invalid GitHub code"}, status=status.HTTP_400_BAD_REQUEST)

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            return Response({"error": "Invalid GitHub code"}, status=status.HTTP_400_BAD_REQUEST)

        # GitHub user info olish
        user_response = requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {access_token}"}
        )
        if user_response.status_code != 200:
            return Response({"error": "Invalid GitHub token"}, status=status.HTTP_400_BAD_REQUEST)

        data = user_response.json()
        username = data.get("login")
        if not username:
            return Response({"error": "GitHub response missing login"}, status=status.HTTP_400_BAD_REQUEST)
        email = data.get("email")
        if not email:
            # Try to get primary verified email from emails API
            emails_resp = requests.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"token {access_token}", "Accept": "application/vnd.github+json"}
            )
            if emails_resp.status_code == 200:
                emails = emails_resp.json()
                primary = next((e for e in emails if e.get('primary') and e.get('verified')), None)
                email = (primary or {}).get('email')
        if not email:
            email = f"{username}@users.noreply.github.com"

        user, created = User.objects.get_or_create(username=username, defaults={"email": email})
        if created:
            user.first_name = data.get("name", "") or ""
            user.save()
        # Ensure profile exists for both new and existing users
        UserProfile.objects.get_or_create(user=user)

        # JWT token
        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        })


class GroupListView(generics.ListAPIView):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []