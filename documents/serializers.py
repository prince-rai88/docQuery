"""
documents/serializers.py

Serializers for the DocQuery REST API.

Conventions
-----------
- DocumentUploadSerializer  — write-only; validates & creates a new Document.
- DocumentSerializer        — read; full document detail including chunk count.
- ChunkSerializer           — read; used internally and for debug endpoints.
- ChatMessageSerializer     — read/write; used for chat history and new messages.
- ChatRequestSerializer     — write-only; validates incoming chat payload.
"""

import filetype  # pure-Python MIME detection; no libmagic dependency
from django.conf import settings
from rest_framework import serializers

from .models import ChatMessage, Chunk, Document


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/x-plain",   # Some encoders use this variant
}

MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


def _validate_file(file):
    """
    Validate file size and MIME type from actual file bytes (not extension).
    Raises ValidationError on failure.
    """
    if file.size > MAX_FILE_BYTES:
        raise serializers.ValidationError(
            f"File too large. Maximum size is 20 MB; received {file.size / 1_048_576:.1f} MB."
        )

    # Read first 2 KB for MIME detection then seek back.
    # filetype detects from magic bytes; falls back to None for plain text
    # (plain text has no magic header — that is expected and handled below).
    header = file.read(2048)
    file.seek(0)

    kind = filetype.guess(header)
    if kind is not None:
        detected_mime = kind.mime
    else:
        # filetype returns None for plain text — treat as text/plain
        detected_mime = "text/plain"

    if detected_mime not in ALLOWED_MIME_TYPES:
        raise serializers.ValidationError(
            f"Unsupported file type '{detected_mime}'. "
            "DocQuery v1 accepts PDF and plain text files only."
        )

    return file


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class DocumentUploadSerializer(serializers.ModelSerializer):
    """
    Write-only serializer for creating a new Document via file upload.
    The owner is injected from the request context — never trusting client input.
    """

    file = serializers.FileField(use_url=False)

    class Meta:
        model = Document
        fields = ["id", "title", "file"]
        read_only_fields = ["id"]

    def validate_file(self, value):
        return _validate_file(value)

    def validate_title(self, value):
        return value.strip() or "Untitled Document"

    def create(self, validated_data):
        # Derive title from filename if not explicitly provided or blank
        file = validated_data["file"]
        if not validated_data.get("title"):
            validated_data["title"] = file.name

        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class DocumentSerializer(serializers.ModelSerializer):
    """
    Read serializer for Document list and detail endpoints.
    Includes computed fields that are useful for the frontend.
    """

    chunk_count = serializers.IntegerField(
        source="chunks.count",
        read_only=True,
        help_text="Number of embedded chunks; 0 while status != 'ready'.",
    )
    message_count = serializers.IntegerField(
        source="messages.count",
        read_only=True,
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "file_url",
            "status",
            "uploaded_at",
            "processed_at",
            "error_message",
            "chunk_count",
            "message_count",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class DocumentStatusSerializer(serializers.ModelSerializer):
    """Minimal serializer for status-polling endpoint."""

    class Meta:
        model = Document
        fields = ["id", "status", "processed_at", "error_message"]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Chunk (debug / internal)
# ---------------------------------------------------------------------------

class ChunkSerializer(serializers.ModelSerializer):
    """
    Read-only serializer.  Embedding is excluded from API responses — it is
    large (384 floats) and not useful to the frontend.
    """

    class Meta:
        model = Chunk
        fields = ["id", "chunk_index", "content", "token_count"]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# ChatMessage
# ---------------------------------------------------------------------------

class ChatMessageSerializer(serializers.ModelSerializer):
    """Full representation of a chat message turn."""

    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "created_at"]
        read_only_fields = fields


class ChatRequestSerializer(serializers.Serializer):
    """
    Write-only serializer that validates an incoming chat request.
    Only the question text is accepted from the client.
    """

    question = serializers.CharField(
        min_length=1,
        max_length=2000,
        trim_whitespace=True,
        help_text="The user's question about the document (max 2000 chars).",
    )


# ---------------------------------------------------------------------------
# Auth / Signup
# ---------------------------------------------------------------------------
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

class UserSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user
