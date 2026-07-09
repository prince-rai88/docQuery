# DocQuery — Backend Data Model Plan

> **Scope**: Models, migrations, and setup decisions only.
> Serializers, views, embedding/chunking logic, and React code are deferred to later phases.

---

## 1. Project & Extension Setup

### What was created

| File / Directory | Purpose |
|---|---|
| `docquery_backend/` | Django project package (settings, urls, wsgi) |
| `documents/` | DRF app containing all domain models |
| `documents/migrations/0001_enable_pgvector_extension.py` | Enables `vector` Postgres extension |
| `documents/migrations/0002_initial_models.py` | Creates all three tables + all indexes |
| `requirements.txt` | Pinned Python dependencies |
| `.env.example` | Template for environment variables |
| `.gitignore` | Excludes secrets, venvs, media, sqlite |

### pgvector setup steps

1. **Install the Python package** (already in requirements.txt):
   ```bash
   pip install pgvector
   ```

2. **Postgres prerequisite** — the `vector` extension must be installable by your DB user.
   - Local dev: your superuser role is sufficient.
   - Managed cloud (Supabase, Neon, RDS): enable `pgvector` from the provider's console first, _then_ run Django migrations.

3. **Run migrations in order**:
   ```bash
   python manage.py migrate documents 0001   # enables CREATE EXTENSION vector
   python manage.py migrate                  # creates all tables + indexes
   ```

4. **Verify in psql**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   -- Expected: one row
   ```

---

## 2. Data Model Reference

### 2.1 `Document`

Represents an uploaded file and its full processing lifecycle.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | BigAutoField (PK) | ✗ | Auto-generated |
| `owner` | FK → User | ✗ | CASCADE delete — deletes all chunks/messages when user is deleted |
| `title` | CharField(255) | ✗ | Set from filename on upload; user can rename |
| `file` | FileField | ✗ | Stored under `media/documents/<owner_id>/…`; v1 accepts PDF + TXT only |
| `status` | CharField(20) | ✗ | Choices: `uploaded`, `processing`, `ready`, `failed`; default `uploaded` |
| `uploaded_at` | DateTimeField | ✗ | auto_now_add — immutable timestamp |
| `processed_at` | DateTimeField | ✓ | Null until status → `ready`; set by the embedding worker |
| `error_message` | TextField | ✓ | Populated only on `failed`; stores exception detail / traceback |

**Why each field exists**:
- `owner` — multi-tenant isolation; every query scopes to the authenticated user.
- `status` — drives the pipeline FSM and gates what the API allows (e.g., block chat if not `ready`).
- `processed_at` — lets you compute processing latency and surface it in the UI.
- `error_message` — critical for diagnosability; users (or admins) need to know _why_ a document failed.

**Indexes**:
- `db_index=True` on `status` — fast filtering for "show me all documents still processing."
- Composite btree `(owner, status)` named `doc_owner_status_idx` — efficient dashboard queries per user.

---

### 2.2 `Chunk`

A text segment produced by splitting a Document, paired with its vector embedding.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | BigAutoField (PK) | ✗ | Auto-generated |
| `document` | FK → Document | ✗ | CASCADE delete |
| `chunk_index` | PositiveIntegerField | ✗ | Zero-based; preserves source order |
| `content` | TextField | ✗ | Normalized text of the chunk |
| `token_count` | PositiveIntegerField | ✗ | Approximate token count (tiktoken or model-native) |
| `embedding` | VectorField(384) | ✗ | Dense float vector for ANN similarity search |

**Why each field exists**:
- `chunk_index` — without order, context windows assembled from ANN results would jumble paragraphs; this enables ranked reconstruction.
- `token_count` — needed for context-window budget management (LLM has token limits); also useful if you later switch to an API-based embedder billed per token.
- `embedding` — the core of RAG; cosine similarity against a query embedding identifies the most relevant chunks.

**Indexes**:
- Composite btree `(document, chunk_index)` named `chunk_doc_order_idx` — bulk-fetches all chunks of a document in order.
- `UniqueConstraint(document, chunk_index)` — ensures idempotent re-processing (safe to upsert by `(doc, index)`).
- **HNSW index** `chunk_embedding_hnsw_idx` — see § 3 below.

---

### 2.3 `ChatMessage`

A single conversational turn tied to a document.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | BigAutoField (PK) | ✗ | Auto-generated |
| `document` | FK → Document | ✗ | CASCADE delete |
| `role` | CharField(10) | ✗ | Choices: `user`, `assistant` |
| `content` | TextField | ✗ | Raw message text |
| `created_at` | DateTimeField | ✗ | auto_now_add — chronological ordering |

**Why each field exists**:
- `role` mirrors the OpenAI/Groq chat-completion schema so messages can be fed directly to the API without transformation.
- `created_at` is the sort key; without a reliable timestamp, history order cannot be reconstructed after concurrent writes.

**Indexes**:
- Btree `(document, created_at)` named `msg_doc_created_idx` — fetches the full conversation for a document in chronological order.

---

## 3. Vector Index Decision

### Chosen: HNSW (Hierarchical Navigable Small World)

```
HnswIndex(
    name="chunk_embedding_hnsw_idx",
    fields=["embedding"],
    m=16,
    ef_construction=64,
    opclasses=["vector_cosine_ops"],
)
```

| Parameter | Value | Rationale |
|---|---|---|
| `m` | 16 | Graph connectivity; pgvector default. Higher → better recall + more RAM. |
| `ef_construction` | 64 | Build-time beam width. 64 is a safe starting point. |
| `opclasses` | `vector_cosine_ops` | Cosine similarity; required for normalised embeddings (all-MiniLM-L6-v2 outputs unit vectors). |

**Why HNSW over IVFFlat**:

| | HNSW | IVFFlat |
|---|---|---|
| Training step | ❌ None needed | ✅ Must INSERT rows first |
| Build speed | Slower | Faster |
| Query recall | Higher | Lower (depends on `nprobe`) |
| Good for | Small–medium, always-growing tables | Large, mostly-static tables |

For DocQuery v1 with a growing dataset and no pre-training requirement, **HNSW is the right choice**.

> **Future tuning**: Once you exceed ~1 M chunks, consider increasing `m` to 32 and `ef_construction` to 128, or switching `ef_search` at query time via `SET hnsw.ef_search = 100;`.

---

## 4. ⚠️ Embedding Model & Dimension — Decision Required

> [!IMPORTANT]
> You **must confirm which embedding model to use** before writing the chunking/embedding worker. The `EMBEDDING_DIMENSION` constant (currently **384**) in `documents/models.py` and the migration dimension **must match the model output**.

### Option A — `sentence-transformers/all-MiniLM-L6-v2` ← **current assumption**

| Property | Value |
|---|---|
| Dimension | **384** |
| Cost | **Free** — runs locally on CPU/GPU |
| Speed | Fast on CPU (~50 ms/chunk on M1) |
| Quality | Good for English document Q&A |
| Dependency | `pip install sentence-transformers` (~500 MB model download) |
| Privacy | Data never leaves your machine |

### Option B — `text-embedding-3-small` (OpenAI)

| Property | Value |
|---|---|
| Dimension | **1536** |
| Cost | $0.02 / 1 M tokens |
| Speed | ~200 ms/chunk (network latency) |
| Quality | Best-in-class for multi-lingual and domain-specific content |
| Dependency | `pip install openai` |
| Privacy | Data sent to OpenAI |

### Option C — `text-embedding-3-large` (OpenAI)

| Property | Value |
|---|---|
| Dimension | **3072** |
| Cost | $0.13 / 1 M tokens |
| Quality | Highest possible |

**Recommendation for v1**: Start with **Option A** (all-MiniLM-L6-v2, 384 dims).
- Zero cost during development.
- Easy to swap later — only requires changing `EMBEDDING_DIMENSION`, running a new migration, and re-embedding all existing chunks.

> If you choose Option B or C, update `EMBEDDING_DIMENSION` in `documents/models.py` and regenerate migration 0002 **before any data is inserted**.

---

## 5. File Upload Assumptions (v1)

| Assumption | Decision | Reasoning |
|---|---|---|
| Accepted formats | PDF, plain text (`.txt`) | Widest use case, simplest parsing (PyMuPDF for PDF, stdlib for TXT). DOCX deferred — requires `python-docx`, adds complexity, low v1 priority. |
| Max file size | **20 MB** | Set via `FILE_UPLOAD_MAX_MEMORY_SIZE` and `DATA_UPLOAD_MAX_MEMORY_SIZE` in settings. Covers ~90 % of real-world documents; larger PDFs (scanned books) can be a later tier. |
| Storage backend | Local filesystem (`media/`) | Simple for dev. Swap to S3/GCS via `django-storages` for production. |
| One file per Document | Yes | A Document has one `FileField`. Multiple files = multiple Documents. Simplifies the upload and processing pipeline. |

---

## 6. Edge Cases — Deferred to Later Phases

| Edge Case | Risk Level | Recommended Handling (future) |
|---|---|---|
| **Empty or corrupt file** | High | Detect during chunking; set `status='failed'` with a clear `error_message`. Validate MIME type and file magic bytes at upload time, not just extension. |
| **Chat asked while status is `processing`** | Medium | API layer should return `HTTP 409 Conflict` with a message like "Document is still being processed. Please try again shortly." Block at the view level. |
| **Re-uploading to replace a failed document** | Medium | Soft-delete existing chunks (`Chunk.objects.filter(document=doc).delete()`), reset `status='uploaded'`, clear `error_message`, re-queue embedding job. Decide whether to overwrite or create a new Document version. |
| **Very large documents** | High | Enforce a max chunk count (e.g., 2,000 chunks ≈ ~1 M tokens). Fail gracefully with `error_message='Document too large for v1 limits'`. Consider async celery task with progress tracking. |
| **Duplicate uploads** | Low | Consider hashing file content (SHA-256) on upload and detecting duplicates per user. Not in scope for v1. |
| **Non-UTF-8 text files** | Medium | Detect encoding via `chardet` during chunking; decode with `errors='replace'` as a fallback. |
| **PDF with no extractable text (scanned)** | Medium | Detect empty extraction result; set `status='failed'` with hint: "PDF appears to be image-only. OCR not supported in v1." |

---

## 7. What's Next (Phase 2 — awaiting your review)

1. **Upload endpoint + file validation** — `POST /api/documents/`
2. **Chunking strategy** — sliding window with overlap; configurable `chunk_size` (tokens) and `overlap`
3. **Embedding worker** — sync for v1 (call embedder in the upload request), async via Celery for v2
4. **RAG query endpoint** — `POST /api/documents/{id}/chat/`
5. **Groq LLM integration** — compose system prompt + retrieved chunks + conversation history
6. **React frontend** — upload UI, chat interface, document status polling

---

*Generated: 2026-07-10 | Stack: Django 4.2 + DRF 3.16 + PostgreSQL + pgvector 0.4 + Groq*
