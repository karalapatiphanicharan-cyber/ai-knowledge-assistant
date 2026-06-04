"""
Embedding service — generates vector embeddings using sentence-transformers.

Model: all-MiniLM-L6-v2  (384-dimensional embeddings, fast & lightweight).
"""

import hashlib
import logging
import re

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-loaded singleton — the model is only downloaded / loaded once.
# ---------------------------------------------------------------------------
_model: SentenceTransformer | bool | None = None


def _get_model() -> SentenceTransformer | None:
    """Return the cached SentenceTransformer model if it is available locally."""
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception as exc:
            logger.warning("[Embedding] Falling back to local hashing embeddings: %s", exc)
            _model = False
    return _model if _model is not False else None


def generate_embeddings(texts: list[str]) -> np.ndarray:
    """
    Generate embeddings for a list of text strings.

    Args:
        texts: A list of text chunks to embed.

    Returns:
        A NumPy array of shape (len(texts), 384) with float32 embeddings.
    """
    model = _get_model()
    if model is not None:
        embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings.astype(np.float32)
    return np.array([_hash_embedding(text) for text in texts], dtype=np.float32)


def generate_single_embedding(text: str) -> np.ndarray:
    """
    Generate an embedding for a single text string.

    Args:
        text: The text to embed.

    Returns:
        A 1-D NumPy array of shape (384,) with float32 values.
    """
    model = _get_model()
    if model is not None:
        embedding = model.encode([text], show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)
        return embedding[0].astype(np.float32)
    return _hash_embedding(text)


def _hash_embedding(text: str) -> np.ndarray:
    """Create a normalized lexical embedding without network/model dependency."""
    vector = np.zeros(384, dtype=np.float32)
    tokens = re.findall(r"\b[a-zA-Z0-9][a-zA-Z0-9-]{1,}\b", text.lower())
    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=4).digest()
        index = int.from_bytes(digest[:2], "little") % vector.shape[0]
        sign = 1.0 if digest[2] % 2 == 0 else -1.0
        vector[index] += sign
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector /= norm
    return vector
