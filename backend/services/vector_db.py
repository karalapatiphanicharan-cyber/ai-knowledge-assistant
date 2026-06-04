import os
import json
import threading
import logging
import numpy as np
import faiss

logger = logging.getLogger(__name__)

DATA_DIR = "data"
INDEX_PATH = os.path.join(DATA_DIR, "faiss.index")
METADATA_PATH = os.path.join(DATA_DIR, "metadata.json")
DIMENSION = 384

os.makedirs(DATA_DIR, exist_ok=True)

_lock = threading.Lock()
_index: faiss.IndexFlatL2 = None
_chunks: list[dict] = []

def _load_from_disk():
    global _index, _chunks
    with _lock:
        try:
            if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
                _index = faiss.read_index(INDEX_PATH)
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    _chunks = json.load(f)
            else:
                _index = faiss.IndexFlatL2(DIMENSION)
                _chunks = []
        except Exception as e:
            _index = faiss.IndexFlatL2(DIMENSION)
            _chunks = []

def _save_to_disk():
    try:
        if _index is not None:
            faiss.write_index(_index, INDEX_PATH)
            with open(METADATA_PATH, "w", encoding="utf-8") as f:
                json.dump(_chunks, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Save error: {e}")

_load_from_disk()

def add_vectors(embeddings: np.ndarray, metadata: list[dict]) -> int:
    global _index, _chunks
    with _lock:
        if _index is None:
            _index = faiss.IndexFlatL2(DIMENSION)
        _index.add(embeddings.astype("float32"))
        _chunks.extend(metadata)
        _save_to_disk()
        return _index.ntotal

def search(query_embedding: np.ndarray, top_k: int = 5) -> list[dict]:
    with _lock:
        if _index is None or _index.ntotal == 0: return []
        k = min(top_k, _index.ntotal)
        distances, indices = _index.search(query_embedding.astype("float32").reshape(1, -1), k)
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(_chunks): continue
            results.append({
                "content": _chunks[idx]["content"],
                "source": _chunks[idx]["source"],
                "index": _chunks[idx].get("index", 0),
                "score": round(float(dist), 4),
            })
        return results

def clear_index():
    global _index, _chunks
    with _lock:
        _index = faiss.IndexFlatL2(DIMENSION)
        _chunks = []
        if os.path.exists(INDEX_PATH): os.remove(INDEX_PATH)
        if os.path.exists(METADATA_PATH): os.remove(METADATA_PATH)

def remove_document(source_name: str):
    global _index, _chunks
    from services.embedding import generate_embeddings
    with _lock:
        remaining_chunks = [c for c in _chunks if c["source"] != source_name]
        if len(remaining_chunks) == len(_chunks): return False
        _chunks = remaining_chunks
        _index = faiss.IndexFlatL2(DIMENSION)
        if _chunks:
            texts = [c["content"] for c in _chunks]
            embeddings = generate_embeddings(texts)
            _index.add(embeddings.astype("float32"))
        _save_to_disk()
        return True

def get_unique_sources() -> list[str]:
    with _lock: return list(dict.fromkeys(chunk["source"] for chunk in _chunks))

def get_all_chunks() -> list[dict]:
    with _lock: return _chunks

def get_stats():
    with _lock:
        sources = list(set(c["source"] for c in _chunks))
        return {
            "document_count": len(sources),
            "chunk_count": len(_chunks),
            "total_chars": sum(len(c["content"]) for c in _chunks)
        }

def get_document_preview(source_name: str, limit: int = 500):
    with _lock:
        doc_chunks = [c for c in _chunks if c["source"] == source_name]
        doc_chunks.sort(key=lambda x: x.get("index", 0))
        if not doc_chunks: return None
        full_text = "\n".join(c["content"] for c in doc_chunks)
        return {
            "source": source_name,
            "preview": full_text[:limit] + "..." if len(full_text) > limit else full_text,
            "word_count": len(full_text.split()),
            "char_count": len(full_text),
            "chunk_count": len(doc_chunks)
        }
