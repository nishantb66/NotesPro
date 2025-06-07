from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Note(models.Model):
    user       = models.ForeignKey(User,
                                   on_delete=models.CASCADE,
                                   related_name='notes')
    content    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note {self.id} by {self.user.username}"
