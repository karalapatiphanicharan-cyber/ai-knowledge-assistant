import logging
import re
import time
from services.embedding import generate_embeddings, generate_single_embedding
from services.vector_db import add_vectors, search, get_stats, get_document_preview
from services.llm import generate_answer, generate_summary, suggest_questions

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
SIMILARITY_THRESHOLD = 0.9 # Optimized for production precision

def _clean_text(text: str) -> str:
    """Normalize whitespace and remove junk characters."""
    text = re.sub(r'[\r\n]+', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def ingest_document(text: str, source: str = "unknown") -> int:
    """
    Process a document: Clean -> Chunk -> Embed -> Store.
    """
    start_time = time.time()
    clean_content = _clean_text(text)
    if not clean_content:
        return 0

    # Improved chunking with overlap
    chunks = []
    for i in range(0, len(clean_content), CHUNK_SIZE - CHUNK_OVERLAP):
        chunk = clean_content[i:i + CHUNK_SIZE].strip()
        if chunk:
            chunks.append(chunk)

    if not chunks:
        return 0

    logger.info(f"[RAG] Ingesting '{source}': {len(chunks)} chunks created.")
    
    embeddings = generate_embeddings(chunks)
    metadata = [
        {
            "content": chunk, 
            "source": source, 
            "index": i,
            "char_count": len(chunk)
        } for i, chunk in enumerate(chunks)
    ]
    
    add_vectors(embeddings, metadata)
    logger.info(f"[RAG] Ingestion completed in {time.time() - start_time:.2f}s")
    return len(chunks)

def query_knowledge_base(question: str, top_k: int = 5) -> dict:
    """
    Query the knowledge base with strict similarity filtering and ranking.
    """
    start_time = time.time()
    logger.info(f"[RAG] Query: {question}")
    
    try:
        query_embedding = generate_single_embedding(question)
        results = search(query_embedding, top_k=top_k)

        if not results:
            return {
                "answer": "Information not found in uploaded documents.",
                "sources": [],
                "confidence": "Low"
            }

        # 1. Similarity Filtering & Logging
        filtered_results = []
        best_score = 10.0
        for r in results:
            score = r["score"]
            best_score = min(best_score, score)
            if score <= SIMILARITY_THRESHOLD:
                filtered_results.append(r)
                logger.info(f"[RAG] Selected chunk (score: {score:.4f}) from {r['source']}")
            else:
                logger.info(f"[RAG] Filtered out chunk (score: {score:.4f}) from {r['source']}")

        if not filtered_results:
            return {
                "answer": "Information not found in uploaded documents.",
                "sources": [],
                "confidence": "Low"
            }

        # 2. Ranking & Deduplication
        filtered_results.sort(key=lambda x: x["score"])

        unique_contents = []
        seen = set()
        sources = []
        seen_files = set()

        for r in filtered_results:
            if r["content"] not in seen:
                unique_contents.append(r["content"])
                seen.add(r["content"])

            fname = r["source"]
            if fname not in seen_files:
                snippet = r["content"][:150].replace('\n', ' ').strip() + "..."
                sources.append({
                    "file": fname,
                    "snippet": snippet,
                    "score": round(r["score"], 4),
                    "chunk_id": r.get("index", 0)
                })
                seen_files.add(fname)

        # Build context
        context = "\n---\n".join(unique_contents)
        context = context[:1200]

        # 3. Grounded Generation
        answer = generate_answer(question, context)

        # Confidence calculation
        confidence = "High" if best_score < 0.6 else "Medium" if best_score < 0.85 else "Low"

        logger.info(f"[RAG] Query completed in {time.time() - start_time:.2f}s")
        return {
            "answer": answer,
            "sources": sources,
            "confidence": confidence
        }

    except Exception as e:
        logger.error(f"[RAG] Error during query: {e}")
        return {
            "answer": "I encountered an error while searching your documents.",
            "sources": [],
            "confidence": "Low"
        }

def get_doc_summary(source_name: str = None) -> dict:
    """Generate summary and stats for documents."""
    from services.vector_db import _chunks

    if source_name:
        doc_chunks = [c for c in _chunks if c["source"] == source_name]
    else:
        doc_chunks = _chunks

    if not doc_chunks:
        return {"error": "No documents found."}

    context = "\n".join(c["content"] for c in doc_chunks[:5])
    summary = generate_summary(context)
    stats = get_stats()

    # Simple topic extraction logic
    topics = list(set(re.findall(r'\b[A-Z][a-z]{3,}\b', context)))[:5]

    return {
        "summary": summary,
        "topics": topics,
        "stats": stats,
        "suggestions": suggest_questions(context)
    }
