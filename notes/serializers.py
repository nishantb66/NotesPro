from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Note, Tag, NoteShare

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username']

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color']

class NoteSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        write_only=True,
        required=False
    )

    class Meta:
        model = Note
        fields = ['id', 'content', 'created_at', 'updated_at', 'tags', 'tag_ids', 'is_favorite']

    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        note = Note.objects.create(**validated_data)
        if tag_ids:
            note.tags.set(tag_ids)
        return note

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tag_ids is not None:
            instance.tags.set(tag_ids)
        return instance

class NoteShareSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = serializers.SlugRelatedField(slug_field='username', queryset=User.objects.all())
    note = NoteSerializer(read_only=True)
    note_id = serializers.PrimaryKeyRelatedField(queryset=Note.objects.all(), write_only=True, source='note', required=False)

    class Meta:
        model = NoteShare
        fields = ['id', 'sender', 'receiver', 'note', 'note_id', 'created_at']
