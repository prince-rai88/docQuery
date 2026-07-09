"""
Migration 0002 — Create Document, Chunk, and ChatMessage tables.

Depends on 0001 (pgvector extension) being applied first.

Index summary
-------------
doc_owner_status_idx        btree  Document(owner, status)
chunk_doc_order_idx         btree  Chunk(document, chunk_index)
chunk_embedding_hnsw_idx    hnsw   Chunk(embedding) cosine
msg_doc_created_idx         btree  ChatMessage(document, created_at)
"""

import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models

import pgvector.django


class Migration(migrations.Migration):

    dependencies = [
        # Must run after:
        #   1. The pgvector extension migration so `vector` type exists.
        ("documents", "0001_enable_pgvector_extension"),
        #   2. Django's auth app so AUTH_USER_MODEL (User) FK is available.
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # -------------------------------------------------------------------
        # 1. Document table
        # -------------------------------------------------------------------
        migrations.CreateModel(
            name="Document",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "title",
                    models.CharField(
                        help_text="Human-readable title; defaults to the filename on upload.",
                        max_length=255,
                    ),
                ),
                (
                    "file",
                    models.FileField(
                        help_text="The raw uploaded file (PDF or .txt). Max 20 MB enforced at the API layer.",
                        upload_to="documents/",
                        validators=[
                            django.core.validators.FileExtensionValidator(
                                allowed_extensions=["pdf", "txt"],
                                message="Only PDF and plain-text (.txt) files are accepted in v1.",
                            )
                        ],
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("uploaded", "Uploaded"),
                            ("processing", "Processing"),
                            ("ready", "Ready"),
                            ("failed", "Failed"),
                        ],
                        db_index=True,
                        default="uploaded",
                        help_text="Current pipeline stage of this document.",
                        max_length=20,
                    ),
                ),
                (
                    "uploaded_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "processed_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Timestamp when all chunks were embedded and status became 'ready'.",
                        null=True,
                    ),
                ),
                (
                    "error_message",
                    models.TextField(
                        blank=True,
                        help_text="Populated only when status='failed'; stores the traceback/reason.",
                        null=True,
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        help_text="The user who uploaded this document.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Document",
                "verbose_name_plural": "Documents",
                "ordering": ["-uploaded_at"],
            },
        ),

        # -------------------------------------------------------------------
        # 2. Chunk table
        # -------------------------------------------------------------------
        migrations.CreateModel(
            name="Chunk",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "chunk_index",
                    models.PositiveIntegerField(
                        help_text="Zero-based sequential position of this chunk within the document.",
                    ),
                ),
                (
                    "content",
                    models.TextField(
                        help_text="Raw text of this chunk (after whitespace normalisation).",
                    ),
                ),
                (
                    "token_count",
                    models.PositiveIntegerField(
                        help_text="Approximate token count.",
                    ),
                ),
                (
                    "embedding",
                    pgvector.django.VectorField(
                        dimensions=384,
                        help_text="Dense vector of dimension 384 for cosine similarity retrieval.",
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        help_text="Parent document this chunk belongs to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chunks",
                        to="documents.document",
                    ),
                ),
            ],
            options={
                "verbose_name": "Chunk",
                "verbose_name_plural": "Chunks",
                "ordering": ["document", "chunk_index"],
            },
        ),

        # -------------------------------------------------------------------
        # 3. ChatMessage table
        # -------------------------------------------------------------------
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("user", "User"),
                            ("assistant", "Assistant"),
                        ],
                        help_text="'user' for human turns, 'assistant' for LLM responses.",
                        max_length=10,
                    ),
                ),
                (
                    "content",
                    models.TextField(
                        help_text="The raw text of this message turn.",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        help_text="UTC timestamp of message creation.",
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        help_text="The document this conversation is about.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="documents.document",
                    ),
                ),
            ],
            options={
                "verbose_name": "Chat Message",
                "verbose_name_plural": "Chat Messages",
                "ordering": ["document", "created_at"],
            },
        ),

        # -------------------------------------------------------------------
        # 4. Unique constraint on Chunk(document, chunk_index)
        # -------------------------------------------------------------------
        migrations.AddConstraint(
            model_name="chunk",
            constraint=models.UniqueConstraint(
                fields=["document", "chunk_index"],
                name="chunk_doc_index_unique",
            ),
        ),

        # -------------------------------------------------------------------
        # 5. Btree indexes
        # -------------------------------------------------------------------
        migrations.AddIndex(
            model_name="document",
            index=models.Index(
                fields=["owner", "status"],
                name="doc_owner_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="chunk",
            index=models.Index(
                fields=["document", "chunk_index"],
                name="chunk_doc_order_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(
                fields=["document", "created_at"],
                name="msg_doc_created_idx",
            ),
        ),

        # -------------------------------------------------------------------
        # 6. HNSW vector index on Chunk.embedding
        #    Requires pgvector >= 0.5 (supports HNSW natively).
        #    opclass vector_cosine_ops → cosine distance (<=>)
        # -------------------------------------------------------------------
        migrations.AddIndex(
            model_name="chunk",
            index=pgvector.django.HnswIndex(
                name="chunk_embedding_hnsw_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ),
    ]
