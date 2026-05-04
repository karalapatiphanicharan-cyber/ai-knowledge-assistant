"""
Embedding service — generates vector embeddings using sentence-transformers.

Model: all-MiniLM-L6-v2  (384-dimensional embeddings, fast & lightweight).
"""

import numpy as np
from sentence_transformers import SentenceTransformer

# ---------------------------------------------------------------------------
# Lazy-loaded singleton — the model is only downloaded / loaded once.
# ---------------------------------------------------------------------------
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Return the cached SentenceTransformer model, loading it on first call."""
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def generate_embeddings(texts: list[str]) -> np.ndarray:
    """
    Generate embeddings for a list of text strings.

    Args:
        texts: A list of text chunks to embed.

    Returns:
        A NumPy array of shape (len(texts), 384) with float32 embeddings.
    """
    model = _get_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embeddings.astype(np.float32)


def generate_single_embedding(text: str) -> np.ndarray:
    """
    Generate an embedding for a single text string.

    Args:
        text: The text to embed.

    Returns:
        A 1-D NumPy array of shape (384,) with float32 values.
    """
    model = _get_model()
    embedding = model.encode([text], show_progress_bar=False, convert_to_numpy=True)
    return embedding[0].astype(np.float32)
