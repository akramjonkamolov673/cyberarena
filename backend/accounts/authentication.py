from typing import Optional, Tuple
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authenticate using the 'access' JWT found in HttpOnly cookies when the
    Authorization header is absent. This allows secure, cookie-based auth.
    """
    def authenticate(self, request: Request) -> Optional[Tuple[object, str]]:
        # Try normal Authorization header first
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token

        # Fallback to 'access' cookie
        cookie_token = request.COOKIES.get('access')
        if not cookie_token:
            return None
        try:
            validated_token = self.get_validated_token(cookie_token)
        except Exception:
            return None
        return self.get_user(validated_token), validated_token
