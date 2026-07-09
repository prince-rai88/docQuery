"""
documents/services/chunker.py

Text extraction and chunking pipeline for PDF and plain-text documents.

Design decisions
----------------
- Chunking strategy: sliding window with token-based sizing.
  Window: 400 tokens, overlap: 50 tokens.
  This keeps each chunk well under typical LLM context-retrieval limits
  while providing enough overlap to avoid cutting off mid-sentence context.

- Token counting: tiktoken (cl100k_base encoder) — same tokenizer family as
  GPT-3.5/4 and close enough to Groq/Llama-3's BPE for budget estimation.

- PDF extraction: PyMuPDF (fitz) — fast, accurate, handles multi-column layouts
  better than pdfplumber for simple cases.

- Plain text: stdlib open() with chardet fallback for non-UTF-8 files.
"""

import io
import logging
from dataclasses import dataclass
from typing import Generator

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants — adjust here and they propagate everywhere
# ---------------------------------------------------------------------------
CHUNK_SIZE_TOKENS = 400     # target max tokens per chunk
CHUNK_OVERLAP_TOKENS = 50   # tokens shared between consecutive chunks
MAX_CHUNKS_PER_DOC = 2_000  # hard cap; docs beyond this are failed gracefully


# ---------------------------------------------------------------------------
# Data class for a raw chunk before embedding
# ---------------------------------------------------------------------------

@dataclass
class RawChunk:
    index: int
    text: str
    token_count: int


# ---------------------------------------------------------------------------
# Lazy imports (heavy deps only loaded when needed)
# ---------------------------------------------------------------------------

def _get_tokenizer():
    """Return a cached tiktoken encoder."""
    try:
        import tiktoken
        return tiktoken.get_encoding("cl100k_base")
    except ImportError:
        raise ImportError(
            "tiktoken is required for token-aware chunking. "
            "Run: pip install tiktoken"
        )


def _count_tokens(enc, text: str) -> int:
    return len(enc.encode(text))


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract plain text from a PDF file using PyMuPDF.
    Returns the full document text as a single string.
    Raises ValueError for password-protected or image-only PDFs.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF is required. Run: pip install pymupdf")

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        text = page.get_text("text")
        pages.append(text)
    doc.close()

    full_text = "\n".join(pages).strip()
    if not full_text:
        raise ValueError(
            "No extractable text found in this PDF. "
            "It may be image-only (scanned). OCR is not supported in v1."
        )
    return full_text


def extract_text_from_txt(file_bytes: bytes) -> str:
    """
    Decode a plain-text file to a string.
    Tries UTF-8 first, then falls back to chardet detection.
    """
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            import chardet
            detected = chardet.detect(file_bytes)
            encoding = detected.get("encoding") or "latin-1"
            return file_bytes.decode(encoding, errors="replace")
        except ImportError:
            # chardet not installed; use latin-1 as a safe fallback
            return file_bytes.decode("latin-1", errors="replace")


def extract_text(file_bytes: bytes, mime_type: str) -> str:
    """Dispatch to the correct extractor based on MIME type."""
    if mime_type == "application/pdf":
        return extract_text_from_pdf(file_bytes)
    elif mime_type in ("text/plain", "text/x-plain"):
        return extract_text_from_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported MIME type for extraction: {mime_type}")


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def _split_into_sentences(text: str) -> list[str]:
    """
    Naive sentence splitter. Splits on '. ', '! ', '? ', and newlines.
    Good enough for v1; replace with spaCy sentence segmenter for v2.
    """
    import re
    # Split on sentence-ending punctuation followed by whitespace, or on newlines
    sentences = re.split(r"(?<=[.!?])\s+|\n{2,}", text)
    return [s.strip() for s in sentences if s.strip()]


def sliding_window_chunks(text: str) -> Generator[RawChunk, None, None]:
    """
    Yield RawChunk objects using a token-aware sliding window.

    Strategy:
        1. Split text into sentences (preserves semantic units).
        2. Greedily pack sentences into a window of ≤ CHUNK_SIZE_TOKENS.
        3. When a window is full, emit it and slide forward by
           (CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS) tokens.

    Yields chunks in order. Raises ValueError if chunk count exceeds MAX_CHUNKS_PER_DOC.
    """
    enc = _get_tokenizer()
    sentences = _split_into_sentences(text)

    if not sentences:
        return

    chunk_index = 0
    buffer: list[str] = []
    buffer_tokens: int = 0

    for sentence in sentences:
        sentence_tokens = _count_tokens(enc, sentence)

        # If a single sentence exceeds the window, hard-split it by characters
        if sentence_tokens > CHUNK_SIZE_TOKENS:
            # Flush existing buffer first
            if buffer:
                chunk_text = " ".join(buffer)
                yield RawChunk(
                    index=chunk_index,
                    text=chunk_text,
                    token_count=_count_tokens(enc, chunk_text),
                )
                chunk_index += 1
                if chunk_index >= MAX_CHUNKS_PER_DOC:
                    raise ValueError(
                        f"Document exceeds the maximum of {MAX_CHUNKS_PER_DOC} chunks."
                    )
                buffer, buffer_tokens = [], 0

            # Hard-split at character level as fallback
            words = sentence.split()
            sub_buffer: list[str] = []
            sub_tokens = 0
            for word in words:
                wt = _count_tokens(enc, word)
                if sub_tokens + wt > CHUNK_SIZE_TOKENS and sub_buffer:
                    sub_text = " ".join(sub_buffer)
                    yield RawChunk(
                        index=chunk_index,
                        text=sub_text,
                        token_count=_count_tokens(enc, sub_text),
                    )
                    chunk_index += 1
                    if chunk_index >= MAX_CHUNKS_PER_DOC:
                        raise ValueError(
                            f"Document exceeds the maximum of {MAX_CHUNKS_PER_DOC} chunks."
                        )
                    sub_buffer, sub_tokens = [], 0
                sub_buffer.append(word)
                sub_tokens += wt

            if sub_buffer:
                buffer = sub_buffer
                buffer_tokens = sub_tokens
            continue

        # Would adding this sentence overflow the window?
        if buffer_tokens + sentence_tokens > CHUNK_SIZE_TOKENS and buffer:
            chunk_text = " ".join(buffer)
            yield RawChunk(
                index=chunk_index,
                text=chunk_text,
                token_count=_count_tokens(enc, chunk_text),
            )
            chunk_index += 1
            if chunk_index >= MAX_CHUNKS_PER_DOC:
                raise ValueError(
                    f"Document exceeds the maximum of {MAX_CHUNKS_PER_DOC} chunks."
                )

            # Keep overlap: trim buffer from the front until it fits
            overlap_tokens = 0
            overlap_buffer: list[str] = []
            for s in reversed(buffer):
                st = _count_tokens(enc, s)
                if overlap_tokens + st > CHUNK_OVERLAP_TOKENS:
                    break
                overlap_buffer.insert(0, s)
                overlap_tokens += st

            buffer = overlap_buffer
            buffer_tokens = overlap_tokens

        buffer.append(sentence)
        buffer_tokens += sentence_tokens

    # Emit the final partial chunk
    if buffer:
        chunk_text = " ".join(buffer)
        yield RawChunk(
            index=chunk_index,
            text=chunk_text,
            token_count=_count_tokens(enc, chunk_text),
        )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def chunk_document(file_bytes: bytes, mime_type: str) -> list[RawChunk]:
    """
    Extract text from a file and split it into chunks.

    Returns a list of RawChunk objects ready for embedding.
    Propagates ValueError for extraction failures or oversized documents.
    """
    text = extract_text(file_bytes, mime_type)
    logger.info(
        "Extracted %d characters from document (mime=%s)", len(text), mime_type
    )
    chunks = list(sliding_window_chunks(text))
    logger.info("Produced %d chunks from document", len(chunks))
    return chunks
