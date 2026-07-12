"""Run the durable document-processing worker."""

import time
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from documents.models import Document
from documents.services.pipeline import process_document


class Command(BaseCommand):
    help = "Continuously process uploaded documents outside the web request cycle."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Document worker started."))

        while True:
            self.requeue_stale_documents()
            document_id = self.claim_next_document()

            if document_id is None:
                time.sleep(settings.DOCUMENT_PROCESSING_POLL_SECONDS)
                continue

            process_document(document_id)

    def claim_next_document(self):
        with transaction.atomic():
            document = (
                Document.objects.select_for_update(skip_locked=True)
                .filter(status=Document.Status.UPLOADED)
                .order_by("uploaded_at")
                .first()
            )
            if document is None:
                return None

            document.status = Document.Status.PROCESSING
            document.processing_started_at = timezone.now()
            document.save(update_fields=["status", "processing_started_at"])
            self.stdout.write(f"Claimed document {document.pk}.")
            return document.pk

    def requeue_stale_documents(self):
        cutoff = timezone.now() - timedelta(
            seconds=settings.PROCESSING_STALE_AFTER_SECONDS
        )
        count = (
            Document.objects.filter(
                status=Document.Status.PROCESSING,
                processing_started_at__lt=cutoff,
            )
            .update(status=Document.Status.UPLOADED, processing_started_at=None)
        )
        if count:
            self.stdout.write(self.style.WARNING(f"Requeued {count} stale document(s)."))
