"""
documents/urls.py

URL routing for the documents app.
All routes are prefixed by /api/documents/ from the project urls.py.
"""

from django.urls import path

from . import views

app_name = "documents"

urlpatterns = [
    # Document collection
    path(
        "",
        views.DocumentListCreateView.as_view(),
        name="document-list-create",
    ),
    # Document detail / delete
    path(
        "<int:pk>/",
        views.DocumentDetailView.as_view(),
        name="document-detail",
    ),
    # Status poll (lightweight; no join overhead)
    path(
        "<int:pk>/status/",
        views.DocumentStatusView.as_view(),
        name="document-status",
    ),
    # RAG chat: POST = ask, GET = history
    path(
        "<int:pk>/chat/",
        views.ChatView.as_view(),
        name="document-chat",
    ),
    # Debug: list chunks
    path(
        "<int:pk>/chunks/",
        views.ChunkListView.as_view(),
        name="document-chunks",
    ),
]
