from django.contrib import admin
from .models import TestSet, CodingChallenge, CodeSubmission, TestSubmission


@admin.register(TestSet)
class TestSetAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'difficulty', 'is_private', 'created_by', 'created_at')
    list_filter = ('difficulty', 'is_private', 'created_at')
    search_fields = ('title', 'description')


@admin.register(CodingChallenge)
class CodingChallengeAdmin(admin.ModelAdmin):
    list_display = ('title', 'difficulty', 'is_private', 'created_by', 'created_at')
    list_filter = ('difficulty', 'is_private')
    search_fields = ('title', 'description', 'created_by__username')
    filter_horizontal = ('assigned_users', 'allowed_groups')


@admin.register(CodeSubmission)
class CodeSubmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'challenge', 'user', 'score', 'passed_count', 'total_tests', 'submitted_at')
    list_filter = ('submitted_at',)
    search_fields = ('challenge__title', 'user__username')


@admin.register(TestSubmission)
class TestSubmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'test', 'user', 'score', 'correct_count', 'wrong_count', 'submitted_at')
    list_filter = ('submitted_at',)
    search_fields = ('test__title', 'user__username')
