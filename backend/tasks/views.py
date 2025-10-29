from rest_framework import viewsets, permissions
from rest_framework.throttling import ScopedRateThrottle
from django.db import models
from django.db.models import Q
from .models import TestSet, CodingChallenge, CodeSubmission, TestSubmission, ChallengeGroup
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
        user_group = getattr(getattr(user, 'profile', None), 'group', None)
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
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        return CodeSubmission.objects.filter(
            Q(user=user) | Q(challenge__created_by=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TestSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = TestSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        return TestSubmission.objects.filter(
            Q(user=user) | Q(test__created_by=user)
        ).distinct()

    def perform_create(self, serializer):
        obj = serializer.save(user=self.request.user)
        try:
            obj.evaluate().save()
        except Exception:
            pass

    def perform_update(self, serializer):
        obj = serializer.save()
        try:
            obj.evaluate().save()
        except Exception:
            pass

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
        user_group = getattr(getattr(user, 'profile', None), 'group', None)
        # Visible challenges:
        # - public
        # - created by user
        # - directly assigned
        # - allowed by user's group
        # - challenges included in groups where the user is a member (assigned_users) or allowed_groups includes user's group
        group_q = models.Q(groups__assigned_users=user)
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
