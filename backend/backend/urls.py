from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tasks.views import TestSetViewSet, CodingChallengeViewSet, CodeSubmissionViewSet, TestSubmissionViewSet, ChallengeGroupViewSet
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'tests', TestSetViewSet, basename='testset')
router.register(r'challenges', CodingChallengeViewSet, basename='codingchallenge')
router.register(r'challenge-groups', ChallengeGroupViewSet, basename='challengegroup')
router.register(r'submissions', CodeSubmissionViewSet, basename='codesubmission')
router.register(r'test-submissions', TestSubmissionViewSet, basename='testsubmission')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('accounts.urls')),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
