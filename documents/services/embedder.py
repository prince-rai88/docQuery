"""
documents/services/embedder.py

Embedding service using sentence-transformers/all-MiniLM-L6-v2.

Model assumptions (from plan.md § 4 — update here if you change models):
  - Model:     sentence-transformers/all-MiniLM-L6-v2
  - Dimension: 384
  - Metric:    cosine similarity (unit-normalised output)
  - Cost:      free, runs locally on CPU/GPU

The model is loaded once at module level and reused across requests.
On first use it downloads ~90 MB from the HuggingFace Hub.

To switch to OpenAI embeddings:
  1. Replace _load_model() and embed_texts() below.
  2. Update EMBEDDING_DIMENSION in models.py.
  3. Generate a new migration that changes the VectorField dimension.
  4. Re-embed all existing chunks.
"""

import logging
from functools import lru_cache
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_SIZE = 64  # number of texts to embed in one forward pass


# ---------------------------------------------------------------------------
# Model loading (singleton via lru_cache)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_model() -> Any:
    """
    Load the sentence-transformer model once and cache it for the process
    lifetime. Thread-safe after the first call.
    """
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        raise ImportError(
            "sentence-transformers is required for embedding. "
            "Run: pip install sentence-transformers"
        )

    logger.info("Loading embedding model '%s'…", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    logger.info("Embedding model loaded (dim=%d).", model.get_sentence_embedding_dimension())
    return model


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of text strings and return a list of float vectors.

    Parameters
    ----------
    texts : list[str]
        Raw text strings (pre-chunked).

    Returns
    -------
    list[list[float]]
        One embedding per input text, each of length EMBEDDING_DIMENSION (384).
    """
    if not texts:
        return []

    model = _load_model()

    # encode() returns a numpy array of shape (n, 384)
    embeddings: np.ndarray = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=False,
        normalize_embeddings=True,  # unit-length → cosine distance via dot product
        convert_to_numpy=True,
    )

    # Convert to plain Python lists for Django/psycopg2 pgvector serialisation
    return embeddings.tolist()


def embed_single(text: str) -> list[float]:
    """Convenience wrapper for embedding one query string at inference time."""
    return embed_texts([text])[0]
