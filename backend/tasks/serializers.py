from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TestSet, CodingChallenge, CodeSubmission, TestSubmission, ChallengeGroup

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class TestSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSet
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


class CodingChallengeSerializer(serializers.ModelSerializer):
    # Optional group injection on create/update
    challenge_group_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    class Meta:
        model = CodingChallenge
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


class CodeSubmissionSerializer(serializers.ModelSerializer):
    meta = serializers.JSONField(required=False, default=dict)
    
    class Meta:
        model = CodeSubmission
        fields = '__all__'
        read_only_fields = ['user', 'submitted_at']
    
    def create(self, validated_data):
        # Ensure meta is always a dictionary
        if 'meta' not in validated_data or validated_data['meta'] is None:
            validated_data['meta'] = {}
        return super().create(validated_data)


class TestSubmissionSerializer(serializers.ModelSerializer):
    test_set = serializers.PrimaryKeyRelatedField(
        queryset=TestSet.objects.all(),
        source='test',
        write_only=True,
        required=False
    )
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TestSubmission
        fields = ['id', 'test', 'test_set', 'user', 'answers', 'correct_count', 'wrong_count', 'score', 'submitted_at']
        read_only_fields = ['user', 'submitted_at', 'correct_count', 'wrong_count', 'score']


class ChallengeGroupSerializer(serializers.ModelSerializer):
    # Allow assigning existing challenges by id
    challenges = serializers.PrimaryKeyRelatedField(
        many=True, queryset=CodingChallenge.objects.all(), required=False
    )

    class Meta:
        model = ChallengeGroup
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']
