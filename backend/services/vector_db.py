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
DOCUMENTS_PATH = os.path.join(DATA_DIR, "documents.json")
DIMENSION = 384 # All-MiniLM-L6-v2 output size

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Module-level state
# ---------------------------------------------------------------------------
_lock = threading.Lock()
_index: faiss.IndexFlatL2 = None
_chunks: list[dict] = []
_documents: dict[str, dict] = {}

def _load_from_disk():
    """Load index and metadata from disk if they exist."""
    global _index, _chunks, _documents
    with _lock:
        try:
            if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
                logger.info(f"[VectorDB] Loading existing index from {INDEX_PATH}...")
                _index = faiss.read_index(INDEX_PATH)
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    _chunks = json.load(f)
                if os.path.exists(DOCUMENTS_PATH):
                    with open(DOCUMENTS_PATH, "r", encoding="utf-8") as f:
                        _documents = json.load(f)
                else:
                    _documents = {}
                    for chunk in _chunks:
                        intelligence = chunk.pop("document_intelligence", None)
                        if intelligence:
                            _documents[chunk["source"]] = intelligence
                logger.info(f"[VectorDB] Loaded {len(_chunks)} chunks.")
            else:
                logger.info("[VectorDB] Starting fresh index.")
                _index = faiss.IndexFlatL2(DIMENSION)
                _chunks = []
                _documents = {}
        except Exception as e:
            logger.error(f"[VectorDB] Load error: {e}")
            _index = faiss.IndexFlatL2(DIMENSION)
            _chunks = []
            _documents = {}

def _save_to_disk():
    """Save index and metadata to disk."""
    try:
        if _index is not None:
            faiss.write_index(_index, INDEX_PATH)
            with open(METADATA_PATH, "w", encoding="utf-8") as f:
                json.dump(_chunks, f, ensure_ascii=False, indent=2)
            with open(DOCUMENTS_PATH, "w", encoding="utf-8") as f:
                json.dump(_documents, f, ensure_ascii=False, indent=2)
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

            vectors = embeddings.astype("float32")
            faiss.normalize_L2(vectors)
            _index.add(vectors)
            _chunks.extend(metadata)
            _save_to_disk()
            return _index.ntotal
        except Exception as e:
            logger.error(f"[VectorDB] Error adding vectors: {e}")
            raise

def replace_source(source: str, embeddings: np.ndarray, metadata: list[dict], document_intelligence: dict | None = None) -> int:
    """Replace all chunks for a source, then add the new vectors."""
    global _documents
    delete_source(source, persist=False)
    if document_intelligence is not None:
        _documents[source] = document_intelligence
    return add_vectors(embeddings, metadata)

def search(query_embedding: np.ndarray, top_k: int = 5) -> list[dict]:
    """Search for most similar chunks."""
    with _lock:
        try:
            if _index is None or _index.ntotal == 0:
                return []

            k = min(top_k, _index.ntotal)
            query = query_embedding.astype("float32").reshape(1, -1)
            faiss.normalize_L2(query)
            distances, indices = _index.search(query, k)

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
                    "similarity_score": round(max(0.0, min(1.0, 1.0 - (float(dist) / 2.0))), 4),
                })
            return results
        except Exception as e:
            logger.error(f"[VectorDB] Search error: {e}")
            return []

def clear_index():
    """Wipe the database and disk files."""
    global _index, _chunks, _documents
    with _lock:
        _index = faiss.IndexFlatL2(DIMENSION)
        _chunks = []
        _documents = {}
        if os.path.exists(INDEX_PATH): os.remove(INDEX_PATH)
        if os.path.exists(METADATA_PATH): os.remove(METADATA_PATH)
        if os.path.exists(DOCUMENTS_PATH): os.remove(DOCUMENTS_PATH)
        logger.info("[VectorDB] Database cleared.")

def _rebuild_index_from_chunks():
    """Recreate the FAISS index from chunk embeddings after deletions."""
    global _index
    _index = faiss.IndexFlatL2(DIMENSION)
    vectors = [chunk.get("embedding") for chunk in _chunks if chunk.get("embedding") is not None]
    if vectors:
        matrix = np.array(vectors, dtype="float32")
        faiss.normalize_L2(matrix)
        _index.add(matrix)

def delete_source(source: str, persist: bool = True) -> bool:
    """Remove every chunk belonging to a source document."""
    global _chunks, _documents
    with _lock:
        before = len(_chunks)
        _chunks = [chunk for chunk in _chunks if chunk.get("source") != source]
        deleted = len(_chunks) != before
        if deleted:
            _documents.pop(source, None)
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
            summaries.setdefault(source, {
                "filename": source,
                "chunks": 0,
                "characters": 0,
                "document_intelligence": _documents.get(source, {}),
            })
            summaries[source]["chunks"] += 1
            summaries[source]["characters"] += len(chunk.get("content", ""))
        return list(summaries.values())

def get_source_chunks(source: str) -> list[dict]:
    """Return all chunks for a source in document order."""
    with _lock:
        chunks = [chunk for chunk in _chunks if chunk.get("source") == source]
        return sorted(chunks, key=lambda item: item.get("index", 0))

def get_document_intelligence(source: str) -> dict | None:
    """Return stored upload-time document intelligence for a source."""
    with _lock:
        return _documents.get(source)

def get_all_document_intelligence() -> list[dict]:
    """Return upload-time intelligence for every document."""
    with _lock:
        return [{"filename": source, **intelligence} for source, intelligence in _documents.items()]
