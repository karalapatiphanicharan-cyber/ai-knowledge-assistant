"""
Vector database service — manages FAISS index and chunk metadata.
Includes persistence to disk so knowledge base survives restarts.
"""

import os
import json
import threading
import logging
import numpy as np
import faiss

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATA_DIR = "data"
INDEX_PATH = os.path.join(DATA_DIR, "faiss.index")
METADATA_PATH = os.path.join(DATA_DIR, "metadata.json")
DIMENSION = 384 # All-MiniLM-L6-v2 output size

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Module-level state
# ---------------------------------------------------------------------------
_lock = threading.Lock()
_index: faiss.IndexFlatL2 = None
_chunks: list[dict] = []

def _load_from_disk():
    """Load index and metadata from disk if they exist."""
    global _index, _chunks
    with _lock:
        try:
            if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
                logger.info(f"[VectorDB] Loading existing index from {INDEX_PATH}...")
                _index = faiss.read_index(INDEX_PATH)
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    _chunks = json.load(f)
                logger.info(f"[VectorDB] Loaded {len(_chunks)} chunks.")
            else:
                logger.info("[VectorDB] Starting fresh index.")
                _index = faiss.IndexFlatL2(DIMENSION)
                _chunks = []
        except Exception as e:
            logger.error(f"[VectorDB] Load error: {e}")
            _index = faiss.IndexFlatL2(DIMENSION)
            _chunks = []

def _save_to_disk():
    """Save index and metadata to disk."""
    try:
        if _index is not None:
            faiss.write_index(_index, INDEX_PATH)
            with open(METADATA_PATH, "w", encoding="utf-8") as f:
                json.dump(_chunks, f, ensure_ascii=False, indent=2)
            logger.info("[VectorDB] Saved to disk.")
    except Exception as e:
        logger.error(f"[VectorDB] Save error: {e}")

# Initialize on module load
_load_from_disk()

def add_vectors(embeddings: np.ndarray, metadata: list[dict]) -> int:
    """Add vectors and save to disk."""
    global _index, _chunks
    with _lock:
        try:
            if _index is None:
                _index = faiss.IndexFlatL2(DIMENSION)

            _index.add(embeddings.astype("float32"))
            _chunks.extend(metadata)
            _save_to_disk()
            return _index.ntotal
        except Exception as e:
            logger.error(f"[VectorDB] Error adding vectors: {e}")
            raise

def search(query_embedding: np.ndarray, top_k: int = 5) -> list[dict]:
    """Search for most similar chunks."""
    with _lock:
        try:
            if _index is None or _index.ntotal == 0:
                return []

            k = min(top_k, _index.ntotal)
            distances, indices = _index.search(query_embedding.astype("float32").reshape(1, -1), k)

            results = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx < 0 or idx >= len(_chunks):
                    continue
                results.append({
                    "content": _chunks[idx]["content"],
                    "source": _chunks[idx]["source"],
                    "index": _chunks[idx].get("index", 0),
                    "score": round(float(dist), 4),
                })
            return results
        except Exception as e:
            logger.error(f"[VectorDB] Search error: {e}")
            return []

def clear_index():
    """Wipe the database and disk files."""
    global _index, _chunks
    with _lock:
        _index = faiss.IndexFlatL2(DIMENSION)
        _chunks = []
        if os.path.exists(INDEX_PATH): os.remove(INDEX_PATH)
        if os.path.exists(METADATA_PATH): os.remove(METADATA_PATH)
        logger.info("[VectorDB] Database cleared.")

def remove_document(source_name: str):
    """Remove all chunks associated with a specific document and rebuild index."""
    global _index, _chunks
    from services.embedding import generate_embeddings

    with _lock:
        # Filter out chunks
        remaining_chunks = [c for c in _chunks if c["source"] != source_name]
        if len(remaining_chunks) == len(_chunks):
            return False # Not found

        _chunks = remaining_chunks

        # Rebuild index from scratch (safest way for FlatL2 with small datasets)
        _index = faiss.IndexFlatL2(DIMENSION)
        if _chunks:
            texts = [c["content"] for c in _chunks]
            # We need to re-embed or store embeddings.
            # Storing embeddings in metadata would be better for performance.
            # For now, let's just re-embed (assuming CPU is okay with this for small scale).
            embeddings = generate_embeddings(texts)
            _index.add(embeddings.astype("float32"))

        _save_to_disk()
        return True

def get_total_vectors() -> int:
    with _lock:
        return _index.ntotal if _index else 0

def get_unique_sources() -> list[str]:
    """Return a list of unique source filenames present in the DB."""
    with _lock:
        return list(dict.fromkeys(chunk["source"] for chunk in _chunks))

def get_stats():
    """Return KB statistics."""
    with _lock:
        sources = list(set(c["source"] for c in _chunks))
        return {
            "document_count": len(sources),
            "chunk_count": len(_chunks),
            "total_chars": sum(len(c["content"]) for c in _chunks)
        }

def get_document_preview(source_name: str, limit: int = 500):
    """Return a preview of the document."""
    with _lock:
        doc_chunks = [c for c in _chunks if c["source"] == source_name]
        doc_chunks.sort(key=lambda x: x.get("index", 0))
        if not doc_chunks:
            return None

        full_text = "\n".join(c["content"] for c in doc_chunks)
        return {
            "source": source_name,
            "preview": full_text[:limit] + "..." if len(full_text) > limit else full_text,
            "word_count": len(full_text.split()),
            "char_count": len(full_text),
            "chunk_count": len(doc_chunks)
        }
