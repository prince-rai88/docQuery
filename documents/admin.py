"""
documents/admin.py

Admin registration for Document, Chunk, and ChatMessage.
Provides a useful interface for inspecting pipeline state during development.
"""

from django.contrib import admin

from .models import ChatMessage, Chunk, Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "owner", "status", "uploaded_at", "processed_at"]
    list_filter = ["status"]
    search_fields = ["title", "owner__username"]
    readonly_fields = ["uploaded_at", "processed_at", "error_message"]
    ordering = ["-uploaded_at"]


@admin.register(Chunk)
class ChunkAdmin(admin.ModelAdmin):
    list_display = ["id", "document", "chunk_index", "token_count"]
    list_filter = ["document__status"]
    search_fields = ["document__title", "content"]
    readonly_fields = ["document", "chunk_index", "content", "token_count", "embedding"]
    ordering = ["document", "chunk_index"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["id", "document", "role", "created_at"]
    list_filter = ["role"]
    search_fields = ["document__title", "content"]
    readonly_fields = ["document", "role", "content", "created_at"]
    ordering = ["document", "created_at"]
