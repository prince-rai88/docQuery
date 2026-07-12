"""
documents/services/pipeline.py

Orchestrates the full document processing pipeline:
    1. Read file bytes from storage
    2. Detect MIME type
    3. Extract text + chunk
    4. Embed chunks in batches
    5. Bulk-insert Chunk rows
    6. Update Document status → 'ready' (or 'failed' on any error)

This runs synchronously inside the upload request for v1.
In v2, call `process_document.delay(document_id)` as a Celery task instead.
"""

import logging
from datetime import datetime, timezone

import filetype

from documents.models import Chunk, Document
from documents.services.chunker import chunk_document
from documents.services.embedder import embed_texts

logger = logging.getLogger(__name__)


def process_document(document_id: int) -> None:
    """
    Full pipeline for a single Document.

    Called immediately after upload in v1.
    Sets status to 'processing' at the start and 'ready'/'failed' at the end.

    Parameters
    ----------
    document_id : int
        PK of the Document row to process.
    """
    try:
        doc = Document.objects.get(pk=document_id)
    except Document.DoesNotExist:
        logger.error("process_document called with non-existent id=%s", document_id)
        return

    # The worker claims a document by moving it to processing before invoking
    # this function. Accept uploaded too to keep the function usable in tasks.
    if doc.status not in (Document.Status.UPLOADED, Document.Status.PROCESSING):
        logger.warning(
            "Skipping document id=%s — status is already '%s'.", document_id, doc.status
        )
        return

    if doc.status == Document.Status.UPLOADED:
        _set_status(doc, Document.Status.PROCESSING)
    logger.info("Processing document id=%s title='%s'", doc.pk, doc.title)

    try:
        # ------------------------------------------------------------------
        # Step 1: Read file bytes
        # ------------------------------------------------------------------
        doc.file.open("rb")
        file_bytes = doc.file.read()
        doc.file.close()

        # ------------------------------------------------------------------
        # Step 2: Detect MIME from content
        # ------------------------------------------------------------------
        kind = filetype.guess(file_bytes[:2048])
        if kind is not None:
            mime_type = kind.mime
        else:
            mime_type = "text/plain"  # filetype returns None for plain text
        logger.debug("Detected MIME type: %s for document id=%s", mime_type, doc.pk)

        # ------------------------------------------------------------------
        # Step 3: Extract text and chunk
        # ------------------------------------------------------------------
        raw_chunks = chunk_document(file_bytes, mime_type)

        if not raw_chunks:
            raise ValueError("Document produced no text content after extraction.")

        # ------------------------------------------------------------------
        # Step 4: Embed all chunks
        # ------------------------------------------------------------------
        texts = [rc.text for rc in raw_chunks]
        logger.info("Embedding %d chunks for document id=%s…", len(texts), doc.pk)
        embeddings = embed_texts(texts)

        # ------------------------------------------------------------------
        # Step 5: Bulk-insert Chunk rows
        # ------------------------------------------------------------------
        # Delete any stale chunks from a previous (failed) processing attempt
        Chunk.objects.filter(document=doc).delete()

        chunk_objs = [
            Chunk(
                document=doc,
                chunk_index=rc.index,
                content=rc.text,
                token_count=rc.token_count,
                embedding=embedding,
            )
            for rc, embedding in zip(raw_chunks, embeddings)
        ]
        Chunk.objects.bulk_create(chunk_objs)
        logger.info(
            "Inserted %d chunks for document id=%s.", len(chunk_objs), doc.pk
        )

        # ------------------------------------------------------------------
        # Step 6: Mark as ready
        # ------------------------------------------------------------------
        doc.status = Document.Status.READY
        doc.processed_at = datetime.now(tz=timezone.utc)
        doc.error_message = None
        doc.save(update_fields=["status", "processed_at", "error_message"])
        logger.info("Document id=%s is now READY.", doc.pk)

    except Exception as exc:  # noqa: BLE001
        logger.exception("Pipeline failed for document id=%s: %s", document_id, exc)
        doc.status = Document.Status.FAILED
        doc.error_message = str(exc)
        doc.save(update_fields=["status", "error_message"])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _set_status(doc: Document, status: str) -> None:
    doc.status = status
    doc.save(update_fields=["status"])
