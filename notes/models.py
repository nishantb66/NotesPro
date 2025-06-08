from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default="#3B82F6")  # Default blue color

    def __str__(self):
        return self.name

class Note(models.Model):
    user       = models.ForeignKey(User,
                                   on_delete=models.CASCADE,
                                   related_name='notes')
    content    = models.TextField()
    tags       = models.ManyToManyField(Tag, related_name='notes', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_favorite = models.BooleanField(default=False)

    def __str__(self):
        return f"Note {self.id} by {self.user.username}"

class NoteShare(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_shares')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_shares')
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='shared_instances')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username} shared note {self.note.id} with {self.receiver.username}"
