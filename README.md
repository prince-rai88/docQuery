<div align="center">

# DocQuery

**Chat with your documents using AI-powered retrieval**

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Django](https://img.shields.io/badge/Django-4.2-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-docquery.app-7C6FF0)](https://docquery.app)

</div>

<!-- screenshot/GIF goes here — drop hero asset after deployment -->

<br />

## Features

- 📄 **Upload PDFs and plain-text files** — drag, title, and process documents up to 20 MB in one flow
- ✂️ **Chunk documents automatically** — split extracted text into token-aware segments ready for search
- 🧠 **Embed locally with sentence-transformers** — generate 384-dim vectors without sending document content to a third-party embedding API
- 🔍 **Retrieve the most relevant passages** — pgvector cosine search surfaces the top chunks for each question
- 💬 **Ask natural-language questions** — get answers grounded in your actual documents via Groq LLM (Llama 3.1)
- 🔐 **Sign up and stay signed in** — Django session auth with protected per-user document isolation
- ⌨️ **Navigate fast** — dark-mode UI with Cmd+K command palette to jump between pages and documents
- 📊 **Track processing state** — poll upload → processing → ready/failed status before chatting

<br />

## Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/Django-4.2-092E20?logo=django&logoColor=white" alt="Django" />
  <img src="https://img.shields.io/badge/Django_REST_Framework-3.16-092E20?logo=django&logoColor=white" alt="DRF" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Groq-Llama_3.1-F55036?logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
</p>

<br />

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ with [pgvector](https://github.com/pgvector/pgvector) available

### 1. Clone & configure

```bash
git clone https://github.com/your-username/docQuery.git
cd docQuery

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, and GROQ_API_KEY
```

### 2. Database

```bash
# Create the database (adjust user/host as needed)
createdb docquery_db

# Run migrations (0001 enables the vector extension, 0002 creates tables)
python manage.py migrate
```

### 3. Backend

```bash
python manage.py runserver
# API → http://127.0.0.1:8000/api/
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# App → http://localhost:5173  (proxies /api → Django)
```

Open **http://localhost:5173**, sign up, upload a document, and chat once status is **ready**.

<br />

## Environment Variables

Copy `.env.example` to `.env` in the project root.

| Variable | Description | Example |
|---|---|---|
| `DEBUG` | Enable Django debug mode (disable in production) | `True` |
| `SECRET_KEY` | Django secret key for signing sessions | `your-secret-key-here-change-in-production` |
| `DATABASE_URL` | PostgreSQL connection string (must support pgvector) | `postgres://postgres:password@localhost:5432/docquery_db` |
| `ALLOWED_HOSTS` | Comma-separated hostnames Django will serve | `localhost,127.0.0.1` |
| `GROQ_API_KEY` | API key for Groq LLM inference ([console.groq.com](https://console.groq.com)) | `gsk_xxxxxxxxxxxxxxxx` |
| `MEDIA_ROOT` | Directory for uploaded document files | `media/` |

> Never commit real keys. `GROQ_API_KEY` is required for chat; uploads and embedding work without it.

<br />

## Architecture

DocQuery is a classic **RAG** (Retrieval-Augmented Generation) pipeline:

1. **Upload** — user uploads a PDF or `.txt` file; Django stores it and kicks off processing
2. **Extract & chunk** — text is extracted (PyMuPDF / chardet), then split into overlapping token-aware segments
3. **Embed** — each chunk is embedded locally with `all-MiniLM-L6-v2` (384 dimensions) via sentence-transformers
4. **Index** — vectors are stored in PostgreSQL using the **pgvector** extension with an HNSW index for fast ANN search
5. **Retrieve** — at query time, the user's question is embedded and the top-K chunks are fetched by cosine distance
6. **Generate** — retrieved context + recent chat history are sent to **Groq** (Llama 3.1); the answer is persisted and returned

```
Upload → Extract → Chunk → Embed → pgvector index
                                        ↓
User question → Embed → Retrieve top-K → Groq LLM → Answer
```

<br />

## Demo Credentials

Use these to try the deployed demo once the account is created:

| Field | Value |
|---|---|
| Username | `demo` |
| Email | `demo@demo.com` |
| Password | `demo1234` |

```bash
# Create the demo user locally before submission:
python manage.py shell -c "
from django.contrib.auth.models import User
User.objects.filter(username='demo').exists() or User.objects.create_user('demo', 'demo@demo.com', 'demo1234')
"
```

<br />

## Troubleshooting

<details>
<summary><strong>pgvector extension fails on migrate</strong></summary>

<br />

Migration `0001_enable_pgvector_extension` runs `CREATE EXTENSION IF NOT EXISTS vector;`. This requires:

1. **pgvector installed on the Postgres server** — not just the Python package:
   ```bash
   # macOS (Homebrew)
   brew install pgvector

   # Ubuntu / Debian — install from source or your PG version's packages
   # https://github.com/pgvector/pgvector#installation
   ```

2. **DB user permissions** — local superuser works; on managed hosts (Supabase, Neon, RDS) enable pgvector in the provider console **before** migrating.

3. **Apply migrations in order:**
   ```bash
   python manage.py migrate documents 0001
   python manage.py migrate
   ```

4. **Verify:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

</details>

<details>
<summary><strong>Chat returns 503 / configuration_error</strong></summary>

<br />

`GROQ_API_KEY` is missing or invalid. Set it in `.env` and restart Django:

```bash
GROQ_API_KEY=gsk_your_key_here
python manage.py runserver
```

</details>

<details>
<summary><strong>First upload is slow</strong></summary>

<br />

sentence-transformers downloads `all-MiniLM-L6-v2` (~90 MB) on first embed. Subsequent uploads are much faster. Ensure outbound network access on first run.

</details>

<details>
<summary><strong>Frontend login fails with CSRF errors</strong></summary>

<br />

Run the Vite dev server (`npm run dev`) — it proxies `/api` to Django and rewrites `Origin`/`Referer` headers. Hitting Django directly from `localhost:5173` without the proxy will break session auth.

</details>

<details>
<summary><strong>Document stuck on "processing" or status "failed"</strong></summary>

<br />

Check the Django runserver logs for extraction/embedding errors. Common causes: corrupted PDF, empty text file, or missing model download. The `error_message` field on the document surfaces the failure in the UI.

</details>

<br />

## License

MIT — see [LICENSE](LICENSE) for details.

<br />

<p align="center">
  <sub>Built as a trial task for Digital Heroes.</sub>
</p>
