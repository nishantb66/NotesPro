from django.urls import path
from .views import (
    signup_view, login_view,
    NoteListCreateView, NoteDetailView
)

urlpatterns = [
    path('signup/', signup_view, name='signup'),
    path('login/',  login_view,  name='login'),
    path('notes/',  NoteListCreateView.as_view(), name='notes-list'),
    path('notes/<int:pk>/', NoteDetailView.as_view(),   name='note-detail'),
]
