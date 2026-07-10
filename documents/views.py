"""
documents/views.py

API views for the DocQuery REST API.

Endpoints
---------
POST   /api/documents/                     Upload a new document
GET    /api/documents/                     List user's documents
GET    /api/documents/<id>/                Document detail
GET    /api/documents/<id>/status/         Lightweight status poll
DELETE /api/documents/<id>/                Delete document + all chunks/messages
POST   /api/documents/<id>/chat/           Ask a question (RAG)
GET    /api/documents/<id>/chat/           Get full conversation history
GET    /api/documents/<id>/chunks/         List chunks (debug)
"""

import logging

from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatMessage, Chunk, Document
from .serializers import (
    ChatMessageSerializer,
    ChatRequestSerializer,
    ChunkSerializer,
    DocumentSerializer,
    DocumentStatusSerializer,
    DocumentUploadSerializer,
)
from .services.pipeline import process_document
from .services.rag import answer_question

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_document_or_404(pk: int, user) -> Document:
    """
    Retrieve a document by PK and ensure it belongs to the requesting user.
    Raises NotFound (404) or PermissionDenied (403) as appropriate.
    """
    try:
        doc = Document.objects.get(pk=pk)
    except Document.DoesNotExist:
        raise NotFound(detail=f"Document {pk} not found.")

    if doc.owner != user:
        raise PermissionDenied(detail="You do not have access to this document.")

    return doc


# ---------------------------------------------------------------------------
# Document list + upload
# ---------------------------------------------------------------------------

class DocumentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/documents/ — list all documents owned by the authenticated user.
    POST /api/documents/ — upload a new document (multipart/form-data).
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DocumentUploadSerializer
        return DocumentSerializer

    def get_queryset(self):
        return (
            Document.objects.filter(owner=self.request.user)
            .prefetch_related("chunks", "messages")
            .order_by("-uploaded_at")
        )

    def create(self, request, *args, **kwargs):
        upload_serializer = DocumentUploadSerializer(
            data=request.data,
            context={"request": request},
        )
        upload_serializer.is_valid(raise_exception=True)
        document = upload_serializer.save()

        logger.info(
            "Document id=%s uploaded by user id=%s; launching pipeline.",
            document.pk,
            request.user.pk,
        )

        # v1: run synchronously in the request cycle.
        # v2: replace with process_document.delay(document.pk) (Celery).
        process_document(document.pk)
        document.refresh_from_db()

        read_serializer = DocumentSerializer(document, context={"request": request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Document detail + delete
# ---------------------------------------------------------------------------

class DocumentDetailView(generics.RetrieveDestroyAPIView):
    """
    GET    /api/documents/<id>/ — full document detail.
    DELETE /api/documents/<id>/ — delete document, cascades to chunks + messages.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DocumentSerializer

    def get_object(self):
        return _get_document_or_404(self.kwargs["pk"], self.request.user)

    def perform_destroy(self, instance):
        logger.info(
            "Document id=%s deleted by user id=%s.", instance.pk, self.request.user.pk
        )
        instance.delete()


# ---------------------------------------------------------------------------
# Status polling  (lightweight; no chunk/message counts)
# ---------------------------------------------------------------------------

class DocumentStatusView(APIView):
    """
    GET /api/documents/<id>/status/
    Returns only: id, status, processed_at, error_message.
    Designed for polling from the frontend while processing.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        doc = _get_document_or_404(pk, request.user)
        serializer = DocumentStatusSerializer(doc)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Chat  (RAG query + history)
# ---------------------------------------------------------------------------

class ChatView(APIView):
    """
    POST /api/documents/<id>/chat/ — ask a question about the document.
    GET  /api/documents/<id>/chat/ — retrieve full conversation history.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        doc = _get_document_or_404(pk, request.user)
        messages = ChatMessage.objects.filter(document=doc).order_by("created_at")
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        doc = _get_document_or_404(pk, request.user)

        # Guard: block chat if document is not ready
        if doc.status != Document.Status.READY:
            return Response(
                {
                    "error": "document_not_ready",
                    "detail": (
                        f"Document is currently '{doc.status}'. "
                        "Chat is only available once processing is complete."
                    ),
                    "status": doc.status,
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Validate incoming payload
        request_serializer = ChatRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        question = request_serializer.validated_data["question"]

        logger.info(
            "Chat query for document id=%s by user id=%s.", doc.pk, request.user.pk
        )

        try:
            answer = answer_question(doc, question)
        except ValueError as exc:
            # Config errors (e.g. missing/invalid GROQ_API_KEY)
            return Response(
                {"error": "configuration_error", "detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Chat failed for document id=%s: %s", doc.pk, exc)
            return Response(
                {"error": "llm_error", "detail": "The LLM service returned an error. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "question": question,
                "answer": answer,
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Chunks  (read-only; useful for debugging / admin inspection)
# ---------------------------------------------------------------------------

class ChunkListView(generics.ListAPIView):
    """
    GET /api/documents/<id>/chunks/
    Returns all chunks in index order. Embedding value is NOT included.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChunkSerializer

    def get_queryset(self):
        doc = _get_document_or_404(self.kwargs["pk"], self.request.user)
        return Chunk.objects.filter(document=doc).order_by("chunk_index")


# ---------------------------------------------------------------------------
# Auth / Signup
# ---------------------------------------------------------------------------
from .serializers import UserSignupSerializer

class SignupView(generics.CreateAPIView):
    """
    POST /api/auth/signup/
    Creates a new User.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = UserSignupSerializer
