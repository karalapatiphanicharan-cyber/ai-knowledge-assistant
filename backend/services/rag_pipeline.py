"""
RAG pipeline — orchestrates text chunking, embedding, storage, and retrieval.
"""

import logging
import re
from services.embedding import generate_embeddings, generate_single_embedding
from services.vector_db import add_vectors, search
from services.llm import generate_answer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Chunking configuration
# ---------------------------------------------------------------------------
CHUNK_SIZE = 800     # Slightly larger for better context
CHUNK_OVERLAP = 100

def _clean_text(text: str) -> str:
    """Normalize whitespace and remove junk characters."""
    text = re.sub(r'[\r\n]+', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def ingest_document(text: str, source: str = "unknown") -> int:
    """
    Process a document: Clean -> Chunk -> Embed -> Store.
    """
    clean_content = _clean_text(text)
    if not clean_content:
        return 0

    # Paragraph-aware chunking
    paragraphs = clean_content.split('\n\n')
    chunks = []
    current_chunk = ""

    for p in paragraphs:
        if len(current_chunk) + len(p) < CHUNK_SIZE:
            current_chunk += p + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = p + "\n\n"
    
    if current_chunk:
        chunks.append(current_chunk.strip())

    if not chunks:
        return 0

    print(f"[RAG] Ingesting '{source}': {len(chunks)} chunks created.")
    
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
    return len(chunks)

def query_knowledge_base(question: str, top_k: int = 6) -> dict:
    """
    Query the knowledge base with improved relevance and cleaning.
    """
    print(f"\n[RAG] Query: {question}")
    
    try:
        query_embedding = generate_single_embedding(question)
        results = search(query_embedding, top_k=top_k)

        if not results:
            print("[RAG] No information found in vector store.")
            return {
                "answer": "I couldn't find any relevant information in the uploaded documents. Please try uploading more files.",
                "sources": []
            }

        # 1. Deduplicate and clean retrieved chunks
        unique_contents = list(dict.fromkeys(r["content"] for r in results))
        
        # Build context
        context = "\n---\n".join(unique_contents)
        context = context[:2000] # Safe limit for flan-t5-small

        print(f"[RAG] Using {len(unique_contents)} unique chunks as context.")

        # 2. Generate answer
        answer = generate_answer(question, context)
        
        # 3. Format sources with snippets
        sources = []
        seen_files = set()
        for r in results:
            fname = r["source"]
            if fname not in seen_files:
                snippet = r["content"][:150].replace('\n', ' ').strip() + "..."
                sources.append({"file": fname, "snippet": snippet})
                seen_files.add(fname)

        print(f"[RAG] Response ready ({len(answer)} chars).")
        return {
            "answer": answer,
            "sources": sources
        }

    except Exception as e:
        print(f"[RAG] Error during query: {e}")
        return {
            "answer": "I encountered an error while searching your documents. Please try again.",
            "sources": []
        }
