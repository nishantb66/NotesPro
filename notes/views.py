from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q

from .models import Note, Tag, NoteShare
from .serializers import UserSerializer, NoteSerializer, TagSerializer, NoteShareSerializer
from .tokens import CustomRefreshToken

User = get_user_model()

@api_view(['POST'])
def signup_view(request):
    username = request.data.get('username')
    if not username:
        return Response({'detail':'Username is required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    user, created = User.objects.get_or_create(username=username)
    refresh = CustomRefreshToken.for_user(user)
    return Response({
        'user':    UserSerializer(user).data,
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    })

@api_view(['POST'])
def login_view(request):
    username = request.data.get('username')
    if not username:
        return Response({'detail':'Username is required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'detail':'Invalid username.'},
                        status=status.HTTP_401_UNAUTHORIZED)

    refresh = CustomRefreshToken.for_user(user)
    return Response({
        'user':    UserSerializer(user).data,
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    })

class TagListCreateView(ListCreateAPIView):
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.all()

class TagDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        return Tag.objects.all()

class NoteListCreateView(ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Note.objects.filter(user=self.request.user)
        
        # Get search parameters
        tag_search = self.request.query_params.get('tag_search', '')
        search = self.request.query_params.get('search', '')
        
        if tag_search:
            # Fuzzy search for tags
            queryset = queryset.filter(
                Q(tags__name__icontains=tag_search) |
                Q(content__icontains=tag_search)
            ).distinct()
        
        if search:
            queryset = queryset.filter(content__icontains=search)
            
        favorite = self.request.query_params.get('favorite', '').lower()
        if favorite == 'true':
            queryset = queryset.filter(is_favorite=True)
        
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class NoteDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)

class NoteShareCreateListView(ListCreateAPIView):
    serializer_class = NoteShareSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NoteShare.objects.filter(sender=self.request.user)

    def create(self, request, *args, **kwargs):
        receiver_username = request.data.get('receiver')
        note_ids = request.data.get('note_ids')
        if not receiver_username or not note_ids:
            return Response({'detail': 'Receiver and note_ids are required.'}, status=400)
        if not isinstance(note_ids, list):
            return Response({'detail': 'note_ids must be a list.'}, status=400)
        try:
            receiver = User.objects.get(username=receiver_username)
        except User.DoesNotExist:
            return Response({'detail': 'User does not exist.'}, status=400)
        notes = Note.objects.filter(id__in=note_ids, user=request.user)
        created_shares = []
        for note in notes:
            share, created = NoteShare.objects.get_or_create(sender=request.user, receiver=receiver, note=note)
            created_shares.append(share)
        serializer = self.get_serializer(created_shares, many=True)
        return Response(serializer.data, status=201)

class NoteShareReceivedListView(ListAPIView):
    serializer_class = NoteShareSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NoteShare.objects.filter(receiver=self.request.user)
