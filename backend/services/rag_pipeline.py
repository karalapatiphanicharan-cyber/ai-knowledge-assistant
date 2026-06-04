import logging
import re
import time
from services.embedding import generate_embeddings, generate_single_embedding
from services.vector_db import replace_source, search, get_source_chunks
from services.llm import generate_answer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CHUNK_SIZE = 900
CHUNK_OVERLAP = 160
SIMILARITY_THRESHOLD = 0.95
NOT_FOUND = "Information not found in uploaded documents."

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
    metadata = []
    for i, chunk in enumerate(chunks):
        metadata.append({
            "content": chunk,
            "source": source,
            "index": i,
            "chunk_id": f"{source}#{i + 1}",
            "char_count": len(chunk),
            "embedding": embeddings[i].astype("float32").tolist(),
        })

    replace_source(source, embeddings, metadata)
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
            logger.info("[RAG] No results found in index.")
            return {
                "answer": NOT_FOUND,
                "sources": []
            }

        # 1. Similarity Filtering & Logging
        filtered_results = []
        for r in results:
            score = r["score"]
            if score <= SIMILARITY_THRESHOLD:
                filtered_results.append(r)
                logger.info(f"[RAG] Selected chunk (score: {score:.4f}) from {r['source']}")
            else:
                logger.info(f"[RAG] Filtered out chunk (score: {score:.4f}) from {r['source']}")

        if not filtered_results:
            logger.info("[RAG] All chunks filtered out by threshold.")
            return {
                "answer": NOT_FOUND,
                "sources": []
            }

        # 2. Ranking & Deduplication
        filtered_results.sort(key=lambda x: x["score"])

        unique_chunks = []
        seen = set()
        sources = []

        for r in filtered_results:
            if r["content"] not in seen:
                unique_chunks.append(r)
                seen.add(r["content"])

        for r in unique_chunks:
            snippet = r["content"][:180].replace('\n', ' ').strip()
            sources.append({
                "filename": r["source"],
                "file": r["source"],
                "chunk_id": r.get("chunk_id") or f"{r['source']}#{r.get('index', 0) + 1}",
                "confidence_score": _confidence_from_distance(r["score"]),
                "snippet": snippet + ("..." if len(r["content"]) > 180 else ""),
            })

        # Build context
        context = "\n---\n".join(r["content"] for r in unique_chunks)
        context = context[:1800]

        # 3. Grounded Generation
        answer = generate_answer(question, context)

        logger.info(f"[RAG] Query completed in {time.time() - start_time:.2f}s")
        return {
            "answer": answer,
            "sources": sources
        }

    except Exception as e:
        logger.error(f"[RAG] Error during query: {e}")
        return {
            "answer": "I encountered an error while searching your documents.",
            "sources": []
        }

def _confidence_from_distance(score: float) -> float:
    """Convert L2 distance into a compact 0..1 confidence score."""
    confidence = max(0.0, min(1.0, 1.0 - (score / SIMILARITY_THRESHOLD)))
    return round(confidence, 2)

def preview_document(source: str) -> dict | None:
    chunks = get_source_chunks(source)
    if not chunks:
        return None
    text = "\n\n".join(chunk["content"] for chunk in chunks)
    ext = source.rsplit(".", 1)[-1].lower() if "." in source else ""
    return {
        "filename": source,
        "type": ext,
        "content": text,
        "chunk_count": len(chunks),
    }

def summarize_document(source: str) -> dict | None:
    chunks = get_source_chunks(source)
    if not chunks:
        return None

    text = "\n\n".join(chunk["content"] for chunk in chunks)
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if len(p.strip()) > 40]
    sentences = re.split(r"(?<=[.!?])\s+", _clean_text(text))
    meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 35]

    overview = " ".join(meaningful_sentences[:2]) or text[:320]
    main_points = meaningful_sentences[2:7] or paragraphs[:5] or [text[:240]]
    topics = _extract_topics(text)
    suggested_questions = [f"What are the main points in {source}?"]
    suggested_questions.extend(f"What does {source} say about {topic}?" for topic in topics[:2])

    return {
        "filename": source,
        "overview": overview[:700],
        "main_points": [point[:280] for point in main_points[:5]],
        "key_topics": topics[:8],
        "suggested_questions": suggested_questions[:4],
    }

def _extract_topics(text: str) -> list[str]:
    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", text.lower())
    stop_words = {
        "this", "that", "with", "from", "have", "were", "will", "your", "about",
        "document", "documents", "there", "their", "which", "would", "could",
        "should", "been", "into", "only", "than", "then", "when", "where",
    }
    counts = {}
    for word in words:
        if word not in stop_words:
            counts[word] = counts.get(word, 0) + 1
    return [word for word, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0]))]
