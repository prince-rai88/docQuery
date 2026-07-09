"""
URL configuration for the docquery_backend project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # Documents API — all document/chunk/chat endpoints
    path("api/documents/", include("documents.urls", namespace="documents")),
    # Built-in DRF session auth endpoints (login/logout for Browsable API)
    path("api/auth/", include("rest_framework.urls", namespace="rest_framework")),
]

# Serve uploaded media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
