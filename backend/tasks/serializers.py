from rest_framework import serializers
from .models import TestSet, CodingChallenge, CodeSubmission, TestSubmission


class TestSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSet
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


class CodingChallengeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodingChallenge
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


class CodeSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeSubmission
        fields = '__all__'
        read_only_fields = ['user', 'submitted_at']


class TestSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSubmission
        fields = '__all__'
        read_only_fields = ['user', 'submitted_at', 'correct_count', 'wrong_count', 'score']
