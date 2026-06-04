import logging
import re
import time
from services.embedding import generate_embeddings, generate_single_embedding
from services.vector_db import add_vectors, search
from services.llm import generate_answer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Chunking configuration
# ---------------------------------------------------------------------------
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

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
    Query the knowledge base with improved relevance and cleaning.
    """
    start_time = time.time()
    logger.info(f"[RAG] Query: {question}")
    
    try:
        query_embedding = generate_single_embedding(question)
        results = search(query_embedding, top_k=top_k)

        if not results:
            return {
                "answer": "I couldn't find any relevant information in the uploaded documents.",
                "sources": []
            }

        # Deduplicate and build context
        unique_contents = []
        seen = set()
        for r in results:
            if r["content"] not in seen:
                unique_contents.append(r["content"])
                seen.add(r["content"])
        
        context = "\n---\n".join(unique_contents)
        # Limit context to avoid overwhelming the small model
        context = context[:1200]

        answer = generate_answer(question, context)
        
        sources = []
        seen_files = set()
        for r in results:
            fname = r["source"]
            if fname not in seen_files:
                snippet = r["content"][:150].replace('\n', ' ').strip() + "..."
                sources.append({"file": fname, "snippet": snippet})
                seen_files.add(fname)

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
