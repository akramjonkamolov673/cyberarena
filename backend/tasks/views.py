import requests
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from .models import TestSet, CodingChallenge, CodeSubmission, TestSubmission, ChallengeGroup
from .permissions import IsTeacher
from .serializers import (
    TestSetSerializer,
    CodingChallengeSerializer,
    CodeSubmissionSerializer,
    TestSubmissionSerializer,
    ChallengeGroupSerializer,
)


class IsCreatorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(obj, 'created_by_id', None) == getattr(request.user, 'id', None)


def _get_user_profile(user):
    """
    Return the attached UserProfile if it exists, otherwise None.
    RelatedObjectDoesNotExist inherits from ObjectDoesNotExist, so we catch that
    to avoid 500s when a user hasn't completed profile setup yet.
    """
    if not getattr(user, 'is_authenticated', False):
        return None
    try:
        return user.profile
    except ObjectDoesNotExist:
        return None


class TestSetViewSet(viewsets.ModelViewSet):
    queryset = TestSet.objects.all()
    serializer_class = TestSetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()


class ChallengeGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ChallengeGroupSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        profile = _get_user_profile(user)
        user_group = getattr(profile, 'group', None)
        q = models.Q(is_private=False) | models.Q(created_by=user) | models.Q(assigned_users=user)
        if user_group:
            q = q | models.Q(allowed_groups=user_group)
        return ChallengeGroup.objects.filter(q).distinct()

    def perform_create(self, serializer):
        grp = serializer.save(created_by=self.request.user)
        # Inherit rules to attached challenges (if any)
        try:
            grp.apply_group_rules()
        except Exception:
            pass

    def perform_update(self, serializer):
        grp = serializer.save()
        try:
            grp.apply_group_rules()
        except Exception:
            pass


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(obj, 'user_id', None) == getattr(request.user, 'id', None)


class CodeSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = CodeSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return CodeSubmission.objects.all()
        return CodeSubmission.objects.filter(
            Q(user=user) | Q(challenge__created_by=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TestSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = TestSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return TestSubmission.objects.all()
        return TestSubmission.objects.filter(
            Q(user=user) | Q(test__created_by=user)
        ).distinct()

    def create(self, request, *args, **kwargs):
        # Handle both test and test_set in request data
        if 'test_set' in request.data and 'test' not in request.data:
            request.data['test'] = request.data['test_set']
        
        # Check if user already has a submission for this test
        test_id = request.data.get('test') or request.data.get('test_set')
        if test_id and TestSubmission.objects.filter(
            user=request.user, 
            test_id=test_id
        ).exists():
            from rest_framework.exceptions import ValidationError
            from rest_framework import status
            raise ValidationError(
                {"detail": "Siz bu testga allaqachon javob yuborgansiz. Testni qayta topshira olmaysiz."},
                code=status.HTTP_400_BAD_REQUEST
            )
            
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        obj = serializer.save(user=self.request.user)
        try:
            obj.evaluate().save()
        except Exception as e:
            print(f"Error evaluating test submission: {e}")

    # Update is not allowed - users can't modify their submissions
    def update(self, request, *args, **kwargs):
        from rest_framework.exceptions import MethodNotAllowed
        raise MethodNotAllowed('PUT', detail="Test topshirig'ini yangilash mumkin emas")

class CodingChallengeViewSet(viewsets.ModelViewSet):
    serializer_class = CodingChallengeSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOrReadOnly]

    # Throttle only creation heavily
    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        if self.request.method == 'POST':
            for t in self.throttle_classes:
                t.scope = 'challenge_create'
            return [t() for t in self.throttle_classes]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        profile = _get_user_profile(user)
        user_group = getattr(profile, 'group', None)
        # Visible challenges:
        # - public
        # - created by user
        # - directly assigned
        # - allowed by user's group akram aytgandima sani hatoyin dib
        # - challenges included in groups where the user is a member (assigned_users) or allowed_groups includes user's group
        # Challenges in groups visible to everyone if the group itself is public (is_private=False)
        group_q = models.Q(groups__assigned_users=user) | models.Q(groups__is_private=False)
        if user_group:
            group_q = group_q | models.Q(groups__allowed_groups=user_group)
        q = (
            models.Q(is_private=False)
            | models.Q(created_by=user)
            | models.Q(assigned_users=user)
            | (models.Q(allowed_groups=user_group) if user_group else models.Q(pk__isnull=True))
            | group_q
        )
        return CodingChallenge.objects.filter(q).distinct()

    def perform_create(self, serializer):
        # Save challenge
        instance = serializer.save(created_by=self.request.user)
        # Attach to group if provided and inherit rules
        group_id = serializer.validated_data.get('challenge_group_id')
        if group_id:
            try:
                grp = ChallengeGroup.objects.get(pk=group_id)
                grp.challenges.add(instance)
                grp.apply_group_rules(instance)
            except ChallengeGroup.DoesNotExist:
                pass

    def perform_update(self, serializer):
        instance = serializer.save()
        group_id = serializer.validated_data.get('challenge_group_id')
        if group_id:
            try:
                grp = ChallengeGroup.objects.get(pk=group_id)
                grp.challenges.add(instance)
                grp.apply_group_rules(instance)
            except ChallengeGroup.DoesNotExist:
                pass


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def run_code(request):
    """
    Proxy code execution requests to Piston while keeping the API key server-side.
    """
    language = request.data.get('language')
    source = request.data.get('source')
    stdin = request.data.get('stdin', '')
    version = request.data.get('version', '*')

    if not language or not source:
        return Response(
            {'detail': 'language va source maydonlari talab qilinadi.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    piston_url = getattr(
        settings,
        'PISTON_API_URL',
        'https://emkc.org/api/v2/piston/execute',
    )
    piston_key = getattr(settings, 'PISTON_API_KEY', None)

    payload = {
        'language': language,
        'version': version,
        'files': [{'name': 'Main', 'content': source}],
        'stdin': stdin,
        'args': request.data.get('args', []),
        'compile_timeout': request.data.get('compile_timeout', 10000),
        'run_timeout': request.data.get('run_timeout', 3000),
        'compile_memory_limit': request.data.get('compile_memory_limit', -1),
        'run_memory_limit': request.data.get('run_memory_limit', -1),
    }

    headers = {'Content-Type': 'application/json'}
    if piston_key:
        headers['Authorization'] = f'Bearer {piston_key}'

    try:
        resp = requests.post(piston_url, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.Timeout:
        return Response(
            {'detail': 'Kod bajarilishi juda uzoq davom etdi.'},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    except requests.exceptions.HTTPError as exc:
        return Response(
            {
                'detail': 'Piston API xatolik qaytardi.',
                'status_code': exc.response.status_code if exc.response else None,
                'response': exc.response.text if exc.response else '',
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except requests.exceptions.RequestException as exc:
        return Response(
            {'detail': 'Piston API bilan bog‘lanib bo‘lmadi.', 'error': str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except ValueError:
        return Response(
            {'detail': 'Piston API noto‘g‘ri javob qaytardi.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # Normalize response with sensible fallbacks (include compile phase)
    run_block = data.get('run', {}) or {}
    compile_block = data.get('compile', {}) or {}

    stdout = run_block.get('stdout') or data.get('stdout') or compile_block.get('stdout') or ''
    stderr = run_block.get('stderr') or data.get('stderr') or compile_block.get('stderr') or ''
    # Prefer run.output, then API-level output, then run.stdout (some languages), finally compile.stderr for visibility
    output = run_block.get('output') or data.get('output') or run_block.get('stdout') or compile_block.get('stderr') or ''
    runtime = run_block.get('time')

    normalized = {
        'stdout': stdout,
        'stderr': stderr,
        'output': output,
        'signal': run_block.get('signal'),
        'language': language,
        'version': data.get('version', version),
        'runtime': runtime,
        'compile': {
            'stdout': compile_block.get('stdout') or '',
            'stderr': compile_block.get('stderr') or '',
            'code': compile_block.get('code'),
        }
    }

    return Response(normalized, status=status.HTTP_200_OK)


run_code.throttle_scope = 'code_run'
