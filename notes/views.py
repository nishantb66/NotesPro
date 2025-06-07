from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Note
from .serializers import UserSerializer, NoteSerializer

User = get_user_model()

@api_view(['POST'])
def signup_view(request):
    username = request.data.get('username')
    if not username:
        return Response({'detail':'Username is required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    user, created = User.objects.get_or_create(username=username)
    refresh = RefreshToken.for_user(user)
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

    refresh = RefreshToken.for_user(user)
    return Response({
        'user':    UserSerializer(user).data,
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    })

class NoteListCreateView(ListCreateAPIView):
    serializer_class    = NoteSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class NoteDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class   = NoteSerializer
    permission_classes = [IsAuthenticated]
    lookup_field       = 'pk'

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)
