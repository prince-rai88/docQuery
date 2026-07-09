"""
documents/models.py

Three core models for the DocQuery RAG application:

    Document    — the uploaded file and its processing lifecycle
    Chunk       — a text segment with its pgvector embedding
    ChatMessage — a conversational turn tied to a specific document
"""

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models
from pgvector.django import HnswIndex, IvfflatIndex, VectorField

# ---------------------------------------------------------------------------
# Embedding dimension constant
# ---------------------------------------------------------------------------
# ⚠️  DECISION REQUIRED: See plan.md § "Embedding Model & Dimension Decision"
#
# Current assumption: sentence-transformers/all-MiniLM-L6-v2  →  384 dims
#   - Runs 100 % locally / free, no API key needed
#   - Reasonable quality for document Q&A
#   - Trade-off: lower quality than OpenAI text-embedding-3-small (1536 dims)
#                or text-embedding-3-large (3072 dims)
#
# If you switch models, update this constant and regenerate migrations.
EMBEDDING_DIMENSION = 384


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------
_allowed_extensions = FileExtensionValidator(
    allowed_extensions=["pdf", "txt"],
    message="Only PDF and plain-text (.txt) files are accepted in v1.",
)


def _document_upload_path(instance, filename):
    """Store uploads under media/documents/<owner_id>/<filename>."""
    return f"documents/{instance.owner_id}/{filename}"


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------
class Document(models.Model):
    """
    Represents a user-uploaded file and tracks its entire processing lifecycle.

    Status FSM:
        uploaded  →  processing  →  ready
                              ↘  failed
    """

    class Status(models.TextChoices):
        UPLOADED   = "uploaded",   "Uploaded"
        PROCESSING = "processing", "Processing"
        READY      = "ready",      "Ready"
        FAILED     = "failed",     "Failed"

    # ---- Ownership --------------------------------------------------------
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
        help_text="The user who uploaded this document.",
    )

    # ---- Content ----------------------------------------------------------
    title = models.CharField(
        max_length=255,
        help_text="Human-readable title; defaults to the filename on upload.",
    )
    file = models.FileField(
        upload_to=_document_upload_path,
        validators=[_allowed_extensions],
        help_text="The raw uploaded file (PDF or .txt). Max 20 MB enforced at the API layer.",
    )

    # ---- Processing lifecycle ---------------------------------------------
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPLOADED,
        db_index=True,          # Index #1 — fast filtering by processing state
        help_text="Current pipeline stage of this document.",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when all chunks were embedded and status became 'ready'.",
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Populated only when status='failed'; stores the traceback/reason.",
    )

    class Meta:
        ordering = ["-uploaded_at"]
        verbose_name = "Document"
        verbose_name_plural = "Documents"

        # status already has db_index=True on the field definition above.
        # Composite index on (owner, status) helps multi-tenant dashboards.
        indexes = [
            models.Index(fields=["owner", "status"], name="doc_owner_status_idx"),
        ]

    def __str__(self):
        return f"[{self.status}] {self.title} (owner={self.owner_id})"


# ---------------------------------------------------------------------------
# Chunk
# ---------------------------------------------------------------------------
class Chunk(models.Model):
    """
    A single text segment produced by splitting a Document, together with its
    vector embedding for similarity search.

    Chunks are ordered by chunk_index and retrieved in that order to reconstruct
    context windows without jumbling paragraphs.
    """

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks",
        help_text="Parent document this chunk belongs to.",
    )
    chunk_index = models.PositiveIntegerField(
        help_text="Zero-based sequential position of this chunk within the document.",
    )
    content = models.TextField(
        help_text="Raw text of this chunk (after whitespace normalisation).",
    )
    token_count = models.PositiveIntegerField(
        help_text="Approximate token count (tiktoken or model-native). Useful for "
                  "debugging and future cost estimation with API-based embedders.",
    )
    embedding = VectorField(
        dimensions=EMBEDDING_DIMENSION,
        help_text=(
            f"Dense vector of dimension {EMBEDDING_DIMENSION}, produced by the "
            "configured embedding model. Used for cosine similarity retrieval."
        ),
    )

    class Meta:
        ordering = ["document", "chunk_index"]
        verbose_name = "Chunk"
        verbose_name_plural = "Chunks"

        constraints = [
            # Enforce uniqueness so re-processing can safely upsert by (doc, index).
            models.UniqueConstraint(
                fields=["document", "chunk_index"],
                name="chunk_doc_index_unique",
            ),
        ]

        indexes = [
            # Index #2: composite btree for ordered retrieval of all chunks in a doc.
            models.Index(
                fields=["document", "chunk_index"],
                name="chunk_doc_order_idx",
            ),
            # Index #3: HNSW vector index — fast approximate nearest-neighbour search.
            # hnsw is preferred over ivfflat for small-to-medium datasets because it
            # requires no training step (no need to INSERT rows before CREATE INDEX).
            #
            # Parameters:
            #   m=16        — graph connectivity; higher → better recall, more memory
            #   ef_construction=64 — build-time beam width; trade-off: quality vs speed
            #   opclass=vector_cosine_ops — cosine similarity (required for normalised
            #                               all-MiniLM-L6-v2 embeddings)
            HnswIndex(
                name="chunk_embedding_hnsw_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self):
        return f"Chunk {self.chunk_index} of Document {self.document_id}"


# ---------------------------------------------------------------------------
# ChatMessage
# ---------------------------------------------------------------------------
class ChatMessage(models.Model):
    """
    A single turn in the conversation about a specific document.

    Roles mirror the OpenAI / Groq chat-completion convention so that messages
    can be fed directly to the LLM API as the conversation history.
    """

    class Role(models.TextChoices):
        USER      = "user",      "User"
        ASSISTANT = "assistant", "Assistant"

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="messages",
        help_text="The document this conversation is about.",
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        help_text="'user' for human turns, 'assistant' for LLM responses.",
    )
    content = models.TextField(
        help_text="The raw text of this message turn.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="UTC timestamp of message creation; used to reconstruct history order.",
    )

    class Meta:
        ordering = ["document", "created_at"]
        verbose_name = "Chat Message"
        verbose_name_plural = "Chat Messages"
        indexes = [
            models.Index(
                fields=["document", "created_at"],
                name="msg_doc_created_idx",
            ),
        ]

    def __str__(self):
        return f"[{self.role}] Document {self.document_id} @ {self.created_at:%Y-%m-%d %H:%M}"
