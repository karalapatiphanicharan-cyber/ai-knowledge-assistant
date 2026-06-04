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
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
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

def replace_source(source: str, embeddings: np.ndarray, metadata: list[dict]) -> int:
    """Replace all chunks for a source, then add the new vectors."""
    delete_source(source, persist=False)
    return add_vectors(embeddings, metadata)

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
                    "chunk_id": _chunks[idx].get("chunk_id"),
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

def _rebuild_index_from_chunks():
    """Recreate the FAISS index from chunk embeddings after deletions."""
    global _index
    _index = faiss.IndexFlatL2(DIMENSION)
    vectors = [chunk.get("embedding") for chunk in _chunks if chunk.get("embedding") is not None]
    if vectors:
        _index.add(np.array(vectors, dtype="float32"))

def delete_source(source: str, persist: bool = True) -> bool:
    """Remove every chunk belonging to a source document."""
    global _chunks
    with _lock:
        before = len(_chunks)
        _chunks = [chunk for chunk in _chunks if chunk.get("source") != source]
        deleted = len(_chunks) != before
        if deleted:
            _rebuild_index_from_chunks()
            if persist:
                _save_to_disk()
        return deleted

def get_total_vectors() -> int:
    with _lock:
        return _index.ntotal if _index else 0

def get_unique_sources() -> list[str]:
    """Return a list of unique source filenames present in the DB."""
    with _lock:
        return list(dict.fromkeys(chunk["source"] for chunk in _chunks))

def get_document_summaries() -> list[dict]:
    """Return document names and chunk counts."""
    with _lock:
        summaries = {}
        for chunk in _chunks:
            source = chunk["source"]
            summaries.setdefault(source, {"filename": source, "chunks": 0, "characters": 0})
            summaries[source]["chunks"] += 1
            summaries[source]["characters"] += len(chunk.get("content", ""))
        return list(summaries.values())

def get_source_chunks(source: str) -> list[dict]:
    """Return all chunks for a source in document order."""
    with _lock:
        chunks = [chunk for chunk in _chunks if chunk.get("source") == source]
        return sorted(chunks, key=lambda item: item.get("index", 0))
