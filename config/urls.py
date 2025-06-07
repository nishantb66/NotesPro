# config/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),       # serves index.html
    path('api/', include('notes.urls')),  # our auth + notes API
]
