from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Note

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username']

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Note
        fields = ['id', 'content', 'created_at', 'updated_at']
