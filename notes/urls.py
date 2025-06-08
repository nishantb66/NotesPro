from django.urls import path
from .views import (
    signup_view, login_view,
    NoteListCreateView, NoteDetailView,
    TagListCreateView, TagDetailView,
    NoteShareCreateListView, NoteShareReceivedListView
)

urlpatterns = [
    path('signup/', signup_view, name='signup'),
    path('login/',  login_view,  name='login'),
    path('notes/',  NoteListCreateView.as_view(), name='notes-list'),
    path('notes/<int:pk>/', NoteDetailView.as_view(),   name='note-detail'),
    path('tags/',   TagListCreateView.as_view(), name='tags-list'),
    path('tags/<int:pk>/', TagDetailView.as_view(), name='tag-detail'),
    path('shares/', NoteShareCreateListView.as_view(), name='note-share'),
    path('shares/received/', NoteShareReceivedListView.as_view(), name='note-share-received'),
]
