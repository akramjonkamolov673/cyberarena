from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Group
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class UserProfileSerializer(serializers.ModelSerializer):
    group = serializers.PrimaryKeyRelatedField(queryset=Group.objects.all(), allow_null=True, required=False)

    class Meta:
        model = UserProfile
        fields = ['avatar', 'group', 'rank', 'role', 'bio', 'joined_at']


# Ro‘yxatdan o‘tishda User va UserProfile’ni birgalikda POST qilish uchun
class RegisterSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'profile']
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, attrs):
        password = attrs.get('password')
        password2 = attrs.pop('password2', None)
        if password2 is not None and password != password2:
            raise serializers.ValidationError({"password2": "Parollar mos kelmadi"})
        # Require email, first_name, last_name
        if not attrs.get('email'):
            raise serializers.ValidationError({"email": "Email majburiy"})
        if not attrs.get('first_name'):
            raise serializers.ValidationError({"first_name": "Ism majburiy"})
        if not attrs.get('last_name'):
            raise serializers.ValidationError({"last_name": "Familya majburiy"})
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', None)
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        if not profile_data:
            profile_data = {}
        # Resolve group id to instance if needed
        group_val = profile_data.get('group') if isinstance(profile_data, dict) else None
        if isinstance(group_val, int):
            try:
                profile_data['group'] = Group.objects.get(pk=group_val)
            except Group.DoesNotExist:
                profile_data['group'] = None
        # Ensure required fields are satisfied; model defaults cover others
        UserProfile.objects.create(user=user, **profile_data)
        return user


# Bitta GET uchun ikkisini birlashtiradigan serializer
class UserFullSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'description']


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field)
        # If input looks like an email, try to translate to username
        if username and '@' in username:
            try:
                user = User.objects.get(email__iexact=username)
                attrs[self.username_field] = user.username
            except User.DoesNotExist:
                pass
        return super().validate(attrs)
