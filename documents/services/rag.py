"""
documents/services/rag.py

Retrieval-Augmented Generation pipeline for document Q&A.

Flow:
    1. Embed the user's question (same model as chunk embeddings)
    2. ANN search on Chunk.embedding using pgvector cosine distance
    3. Fetch recent conversation history from ChatMessage
    4. Compose a prompt: system + retrieved context + history + question
    5. Call Groq LLM and return the assistant reply
    6. Persist both the user message and the assistant reply
"""

import logging
from typing import Optional

from django.conf import settings

from documents.models import ChatMessage, Chunk, Document
from documents.services.embedder import embed_single

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# RAG configuration constants
# ---------------------------------------------------------------------------
TOP_K_CHUNKS = 5           # number of chunks to retrieve per query
MAX_HISTORY_TURNS = 6      # number of previous (user + assistant) turns to include
GROQ_MODEL = "llama3-8b-8192"       # model served by Groq
MAX_COMPLETION_TOKENS = 1024        # cap on LLM answer length


# ---------------------------------------------------------------------------
# Groq client (lazy init)
# ---------------------------------------------------------------------------

def _get_groq_client():
    try:
        from groq import Groq
    except ImportError:
        raise ImportError(
            "The 'groq' package is required. Run: pip install groq"
        )

    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is not set. Add it to your .env file."
        )
    return Groq(api_key=api_key)


# ---------------------------------------------------------------------------
# Context retrieval
# ---------------------------------------------------------------------------

def retrieve_chunks(document: Document, query_embedding: list[float]) -> list[Chunk]:
    """
    Use pgvector's <=> (cosine distance) operator to find the TOP_K_CHUNKS
    most relevant chunks for the given query embedding.

    The HNSW index on Chunk.embedding makes this sub-millisecond for
    realistic dataset sizes.
    """
    from pgvector.django import CosineDistance

    chunks = (
        Chunk.objects.filter(document=document)
        .annotate(distance=CosineDistance("embedding", query_embedding))
        .order_by("distance")[:TOP_K_CHUNKS]
    )
    return list(chunks)


def build_context_block(chunks: list[Chunk]) -> str:
    """Format retrieved chunks as a numbered context block for the prompt."""
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        parts.append(f"[{i}] {chunk.content.strip()}")
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# History retrieval
# ---------------------------------------------------------------------------

def get_recent_history(document: Document) -> list[dict]:
    """
    Return the last MAX_HISTORY_TURNS messages as a list of
    {role, content} dicts — ready for Groq's messages array.
    """
    messages = (
        ChatMessage.objects.filter(document=document)
        .order_by("-created_at")[: MAX_HISTORY_TURNS * 2]  # user + assistant pairs
    )
    # Reverse to chronological order
    return [{"role": m.role, "content": m.content} for m in reversed(messages)]


# ---------------------------------------------------------------------------
# Prompt composition
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are a precise, helpful assistant that answers questions strictly based on the
provided document context. Follow these rules:

1. Answer ONLY from the context passages below.
2. If the answer cannot be found in the context, say exactly:
   "I couldn't find that information in this document."
3. Do not hallucinate or add external knowledge.
4. Keep answers concise but complete. Use bullet points when listing items.
5. Cite the context passage number (e.g., [1], [2]) when you quote or paraphrase.
"""


def compose_messages(
    context_block: str,
    history: list[dict],
    question: str,
) -> list[dict]:
    """
    Build the full messages array for the Groq chat completion API.

    Structure:
        [system]
        [user: context + question]   ← first user turn always injects context
        [assistant: ...]
        [user: ...]
        ...
        [user: current question]
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Inject context into the first user message of this turn
    context_turn = (
        f"Use the following document excerpts to answer my question.\n\n"
        f"=== DOCUMENT CONTEXT ===\n{context_block}\n=== END CONTEXT ===\n\n"
        f"Question: {question}"
    )

    if history:
        # Prepend context to the oldest user turn in history if it exists,
        # otherwise add it as a standalone first message.
        messages.extend(history)
        # Append the current question with context freshly prepended
        messages.append({"role": "user", "content": context_turn})
    else:
        messages.append({"role": "user", "content": context_turn})

    return messages


# ---------------------------------------------------------------------------
# Main RAG entry point
# ---------------------------------------------------------------------------

def answer_question(document: Document, question: str) -> str:
    """
    Full RAG pipeline for one user question.

    1. Embed question
    2. Retrieve relevant chunks
    3. Fetch conversation history
    4. Call Groq
    5. Persist user + assistant messages
    6. Return assistant answer text

    Parameters
    ----------
    document : Document
        The Document being queried. Must have status='ready'.
    question : str
        The user's question.

    Returns
    -------
    str
        The LLM's answer.
    """
    # ------------------------------------------------------------------
    # Step 1: Embed the question
    # ------------------------------------------------------------------
    logger.info("RAG: embedding question for document id=%s", document.pk)
    query_embedding = embed_single(question)

    # ------------------------------------------------------------------
    # Step 2: Retrieve top-K chunks
    # ------------------------------------------------------------------
    chunks = retrieve_chunks(document, query_embedding)
    if not chunks:
        no_context = (
            "I couldn't find any relevant passages in this document "
            "to answer your question."
        )
        _persist_turn(document, question, no_context)
        return no_context

    context_block = build_context_block(chunks)
    logger.debug("Retrieved %d chunks for question lookup.", len(chunks))

    # ------------------------------------------------------------------
    # Step 3: Fetch recent conversation history
    # ------------------------------------------------------------------
    history = get_recent_history(document)

    # ------------------------------------------------------------------
    # Step 4: Compose messages and call Groq
    # ------------------------------------------------------------------
    messages = compose_messages(context_block, history, question)
    client = _get_groq_client()

    logger.info(
        "RAG: calling Groq model='%s' with %d messages.", GROQ_MODEL, len(messages)
    )
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        max_tokens=MAX_COMPLETION_TOKENS,
        temperature=0.2,   # low temperature → more factual, less creative
    )
    answer = response.choices[0].message.content.strip()
    logger.info(
        "RAG: received answer (%d chars) from Groq.", len(answer)
    )

    # ------------------------------------------------------------------
    # Step 5: Persist conversation turn
    # ------------------------------------------------------------------
    _persist_turn(document, question, answer)

    return answer


def _persist_turn(document: Document, question: str, answer: str) -> None:
    """Save the user question and assistant answer as ChatMessage rows."""
    ChatMessage.objects.bulk_create([
        ChatMessage(document=document, role=ChatMessage.Role.USER, content=question),
        ChatMessage(document=document, role=ChatMessage.Role.ASSISTANT, content=answer),
    ])
