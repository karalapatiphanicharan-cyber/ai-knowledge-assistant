import logging
import re
import time
from services.embedding import generate_embeddings, generate_single_embedding
from services.vector_db import add_vectors, search, get_stats, get_document_preview, _chunks
from services.llm import generate_answer, generate_summary, suggest_questions

logger = logging.getLogger(__name__)

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
SIMILARITY_THRESHOLD = 0.85 # Slightly stricter

def _is_summary_request(text: str) -> bool:
    """Detect if the user is asking for a summary."""
    patterns = [r'\bsummarize\b', r'\bsummary\b', r'\boverview\b', r'\bkey points\b', r'\bmain takeaways\b']
    return any(re.search(p, text.lower()) for p in patterns)

def ingest_document(text: str, source: str = "unknown") -> int:
    start_time = time.time()
    clean_content = re.sub(r'[\r\n]+', '\n', text)
    clean_content = re.sub(r'[ \t]+', ' ', clean_content).strip()

    if not clean_content: return 0

    chunks = []
    for i in range(0, len(clean_content), CHUNK_SIZE - CHUNK_OVERLAP):
        chunk = clean_content[i:i + CHUNK_SIZE].strip()
        if chunk: chunks.append(chunk)

    if not chunks: return 0

    embeddings = generate_embeddings(chunks)
    metadata = [{
        "content": chunk,
        "source": source,
        "index": i,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    } for i, chunk in enumerate(chunks)]
    
    add_vectors(embeddings, metadata)
    return len(chunks)

def query_knowledge_base(question: str, top_k: int = 6) -> dict:
    """Enhanced query with summary detection and multi-chunk synthesis."""
    if _is_summary_request(question) and _chunks:
        return {
            "answer": "Generating document summary...",
            "is_summary": True,
            "summary_data": get_doc_summary(),
            "sources": [],
            "confidence": "High"
        }

    try:
        query_embedding = generate_single_embedding(question)
        results = search(query_embedding, top_k=top_k)

        if not results:
            return {"answer": "Information not found in uploaded documents.", "sources": [], "confidence": "Low"}

        filtered_results = [r for r in results if r["score"] <= SIMILARITY_THRESHOLD]
        if not filtered_results:
            return {"answer": "Information not found in uploaded documents.", "sources": [], "confidence": "Low"}

        filtered_results.sort(key=lambda x: x["score"])

        unique_contents = []
        seen = set()
        sources = []
        seen_files = set()

        for r in filtered_results:
            if r["content"] not in seen:
                unique_contents.append(r["content"])
                seen.add(r["content"])

            if r["source"] not in seen_files:
                sources.append({
                    "file": r["source"],
                    "score": round(r["score"], 4),
                    "chunk_id": r.get("index", 0)
                })
                seen_files.add(r["source"])

        context = "\n---\n".join(unique_contents)[:2000]
        answer = generate_answer(question, context)

        best_score = filtered_results[0]["score"]
        confidence = "High" if best_score < 0.5 else "Medium" if best_score < 0.75 else "Low"

        return {
            "answer": answer,
            "sources": sources,
            "confidence": confidence
        }
    except Exception as e:
        logger.error(f"Query error: {e}")
        return {"answer": "Error searching documents.", "sources": [], "confidence": "Low"}

def search_snippets(query: str, top_k: int = 5) -> list:
    """Direct snippet search for the sidebar search feature."""
    if not _chunks: return []
    query_embedding = generate_single_embedding(query)
    results = search(query_embedding, top_k=top_k)
    return [{
        "source": r["source"],
        "snippet": r["content"][:150] + "...",
        "score": round(r["score"], 4)
    } for r in results if r["score"] < 1.0]

def get_doc_summary(source_name: str = None) -> dict:
    relevant_chunks = [c for c in _chunks if c["source"] == source_name] if source_name else _chunks
    if not relevant_chunks: return {"error": "No documents found."}

    context = "\n".join(c["content"] for c in relevant_chunks[:8])
    summary_obj = generate_summary(context)
    stats = get_stats()

    return {
        **summary_obj,
        "stats": stats,
        "suggestions": suggest_questions(context)
    }
