from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Profile(models.Model):
    user      = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=100, blank=True)
    email     = models.EmailField(blank=True)
    interests = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.username}'s profile"