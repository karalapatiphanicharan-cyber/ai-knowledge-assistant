import logging
import re
import time
from services.embedding import generate_embeddings, generate_single_embedding
from services.vector_db import (
    replace_source,
    search,
    get_source_chunks,
    get_document_intelligence,
    get_all_document_intelligence,
)
from services.llm import generate_answer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CHUNK_SIZE = 700
CHUNK_OVERLAP = 125
TOP_K = 5
MIN_RELEVANCE_SCORE = 0.22
NOT_FOUND = "The uploaded documents do not contain information about that."
SUMMARY_PATTERNS = (
    "summarize this pdf",
    "summarize this document",
    "summarize the document",
    "summary of this document",
    "give overview",
    "give an overview",
    "overview",
)
TOPIC_PATTERNS = (
    "what are the key topics",
    "key topics",
    "suggested questions",
)

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

    chunks = _chunk_text(clean_content)

    if not chunks:
        return 0

    logger.info(f"[RAG] Ingesting '{source}': {len(chunks)} chunks created.")
    
    embeddings = generate_embeddings(chunks)
    document_intelligence = build_document_intelligence(clean_content, source)
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

    replace_source(source, embeddings, metadata, document_intelligence=document_intelligence)
    logger.info(f"[RAG] Ingestion completed in {time.time() - start_time:.2f}s")
    return len(chunks)

def query_knowledge_base(question: str, top_k: int = TOP_K) -> dict:
    """
    Query the knowledge base with strict similarity filtering and ranking.
    """
    start_time = time.time()
    logger.info(f"[RAG] Query: {question}")
    
    try:
        intelligence_answer = _answer_from_document_intelligence(question)
        if intelligence_answer:
            return intelligence_answer

        query_embedding = generate_single_embedding(question)
        results = search(query_embedding, top_k=max(top_k * 4, 12))

        if not results:
            logger.info("[RAG] No results found in index.")
            return {
                "answer": NOT_FOUND,
                "sources": []
            }

        results = _dedupe_results(_rerank_results(question, results))

        filtered_results = []
        best_relevance = results[0]["relevance_score"] if results else 0.0
        adaptive_floor = max(MIN_RELEVANCE_SCORE, best_relevance - 0.18)
        for r in results:
            relevance = r["relevance_score"]
            if relevance >= adaptive_floor:
                filtered_results.append(r)
                logger.info(f"[RAG] Selected chunk (relevance: {relevance:.4f}) from {r['source']}")
            else:
                logger.info(f"[RAG] Filtered chunk (relevance: {relevance:.4f}) from {r['source']}")

        if not filtered_results:
            logger.info("[RAG] All chunks filtered out by threshold.")
            return {
                "answer": NOT_FOUND,
                "sources": []
            }

        unique_chunks = filtered_results[:top_k]
        sources = []

        for r in unique_chunks:
            snippet = r["content"][:180].replace('\n', ' ').strip()
            source_chunk_count = len(get_source_chunks(r["source"]))
            sources.append({
                "filename": r["source"],
                "file": r["source"],
                "chunk_id": r.get("chunk_id") or f"{r['source']}#{r.get('index', 0) + 1}",
                "chunk_index": r.get("index", 0),
                "chunk_count": source_chunk_count,
                "retrieved_chunk_count": len(unique_chunks),
                "similarity_score": round(r["relevance_score"], 4),
                "confidence_score": round(r["relevance_score"], 2),
                "snippet": snippet + ("..." if len(r["content"]) > 180 else ""),
            })

        # Build context
        context = "\n\n---\n\n".join(
            f"[{r.get('chunk_id') or r['source']}]\n{r['content']}" for r in unique_chunks
        )
        context = context[:5000]

        # 3. Grounded Generation
        answer = generate_answer(question, context)

        logger.info(f"[RAG] Query completed in {time.time() - start_time:.2f}s")
        return {
            "answer": answer,
            "sources": [] if answer == NOT_FOUND else sources
        }

    except Exception as e:
        logger.error(f"[RAG] Error during query: {e}")
        return {
            "answer": "I encountered an error while searching your documents.",
            "sources": []
        }

def _chunk_text(text: str) -> list[str]:
    """Paragraph-aware chunking that avoids splitting sentences when possible."""
    page_chunks = _chunk_marked_pages(text)
    if page_chunks:
        return page_chunks

    blocks = [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
    chunks = []
    current = ""

    for block in blocks:
        units = _split_oversized_block(block)
        for unit in units:
            candidate = f"{current}\n\n{unit}".strip() if current else unit
            if len(candidate) <= CHUNK_SIZE:
                current = candidate
                continue

            if current:
                chunks.append(current)
                current = _overlap_tail(current)

            candidate = f"{current}\n\n{unit}".strip() if current else unit
            if len(candidate) <= CHUNK_SIZE:
                current = candidate
            else:
                for piece in _sliding_window(unit):
                    chunks.append(piece)
                current = ""

    if current.strip():
        chunks.append(current.strip())

    return [chunk for chunk in chunks if chunk]

def _chunk_marked_pages(text: str) -> list[str]:
    matches = list(re.finditer(r"(?m)^\[Page \d+\]", text))
    if not matches:
        return []

    chunks = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        page_text = text[start:end].strip()
        if not page_text:
            continue
        if len(page_text) <= CHUNK_SIZE:
            chunks.append(page_text)
        else:
            chunks.extend(_sliding_window(page_text))
    return chunks

def _sliding_window(text: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(text):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks

def _split_oversized_block(block: str) -> list[str]:
    if len(block) <= CHUNK_SIZE:
        return [block]

    sentences = re.split(r"(?<=[.!?])\s+", block)
    units = []
    current = ""
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        candidate = f"{current} {sentence}".strip() if current else sentence
        if len(candidate) <= CHUNK_SIZE:
            current = candidate
        else:
            if current:
                units.append(current)
            current = sentence
    if current:
        units.append(current)
    return units or [block]

def _overlap_tail(text: str) -> str:
    if len(text) <= CHUNK_OVERLAP:
        return text
    tail = text[-CHUNK_OVERLAP:]
    sentence_boundary = max(tail.rfind(". "), tail.rfind("? "), tail.rfind("! "), tail.rfind("\n"))
    if sentence_boundary > 20:
        return tail[sentence_boundary + 1:].strip()
    return tail.strip()

def _rerank_results(question: str, results: list[dict]) -> list[dict]:
    query_terms = _important_terms(question)
    phrase_boosts = re.findall(r"\b(?:page|section|chapter)\s+\d+\b", question.lower())

    def rank_key(result: dict):
        content_terms = _important_terms(result["content"])
        lexical_overlap = len(query_terms & content_terms)
        lexical_ratio = lexical_overlap / max(len(query_terms), 1)
        lower_content = result["content"].lower()
        heading_bonus = 0
        phrase_bonus = 0
        first_line = lower_content.splitlines()[0] if result["content"] else ""
        if any(term in first_line for term in query_terms):
            heading_bonus = 0.08
        if any(re.search(rf"\b{re.escape(phrase)}\b", lower_content) for phrase in phrase_boosts):
            phrase_bonus = 0.18
        vector_score = result.get("similarity_score")
        if vector_score is None:
            vector_score = max(0.0, 1.0 - (result["score"] / 2.0))
        combined_score = (0.72 * vector_score) + (0.28 * lexical_ratio) + heading_bonus + phrase_bonus
        result["relevance_score"] = round(max(0.0, min(1.0, combined_score)), 4)
        return (-result["relevance_score"], -lexical_overlap, result["score"])

    return sorted(results, key=rank_key)

def _dedupe_results(results: list[dict]) -> list[dict]:
    unique = []
    seen = set()
    for result in results:
        normalized = re.sub(r"\s+", " ", result["content"].lower()).strip()
        fingerprint = normalized[:500]
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        unique.append(result)
    return unique

def _important_terms(text: str) -> set[str]:
    stop_words = {
        "this", "that", "with", "from", "have", "were", "will", "your", "about",
        "document", "documents", "there", "their", "which", "would", "could",
        "should", "been", "into", "only", "than", "then", "when", "where",
        "what", "summarize", "summary", "overview", "explain", "section",
    }
    return {
        word for word in re.findall(r"\b[a-zA-Z0-9][a-zA-Z0-9-]{1,}\b", text.lower())
        if word not in stop_words
    }

def preview_document(source: str) -> dict | None:
    intelligence = get_document_intelligence(source)
    if intelligence is None:
        return None
    ext = source.rsplit(".", 1)[-1].lower() if "." in source else ""
    return {
        "filename": source,
        "type": ext,
        "content": intelligence.get("preview_text", ""),
        "chunk_count": len(get_source_chunks(source)),
    }

def summarize_document(source: str) -> dict | None:
    intelligence = get_document_intelligence(source)
    if intelligence is None:
        return None
    return {
        "filename": source,
        "overview": intelligence.get("overview", ""),
        "main_points": intelligence.get("main_points", []),
        "key_topics": intelligence.get("key_topics", []),
        "suggested_questions": intelligence.get("suggested_questions", []),
    }

def build_document_intelligence(text: str, source: str) -> dict:
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if len(p.strip()) > 40]
    sentences = re.split(r"(?<=[.!?])\s+", _clean_text(text))
    meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 35]

    overview_candidates = _score_sentences_for_summary(meaningful_sentences)
    overview = " ".join(overview_candidates[:3]) or text[:500]
    main_points = overview_candidates[3:8] or meaningful_sentences[:5] or paragraphs[:5] or [text[:300]]
    topics = _extract_topics(text)
    suggested_questions = [f"What are the main points in {source}?"]
    suggested_questions.extend(f"What does {source} say about {topic}?" for topic in topics[:3])

    return {
        "overview": overview[:900],
        "main_points": [point[:320] for point in main_points[:6]],
        "key_topics": topics[:10],
        "suggested_questions": suggested_questions[:5],
        "preview_text": text,
    }

def _score_sentences_for_summary(sentences: list[str]) -> list[str]:
    if not sentences:
        return []
    all_text = " ".join(sentences)
    topics = _extract_topics(all_text)[:20]
    topic_set = set(topics)
    indexed = []
    for index, sentence in enumerate(sentences):
        terms = _important_terms(sentence)
        score = len(terms & topic_set)
        if index < 5:
            score += 2
        indexed.append((score, index, sentence))
    ranked = sorted(indexed, key=lambda item: (-item[0], item[1]))
    selected = sorted(ranked[:8], key=lambda item: item[1])
    return [sentence for _, _, sentence in selected]

def _answer_from_document_intelligence(question: str) -> dict | None:
    normalized = question.lower().strip()
    is_summary = any(pattern in normalized for pattern in SUMMARY_PATTERNS)
    is_topics = any(pattern in normalized for pattern in TOPIC_PATTERNS)
    if not is_summary and not is_topics:
        return None

    docs = get_all_document_intelligence()
    if not docs:
        return {"answer": NOT_FOUND, "sources": []}

    selected_doc = _select_document_for_question(normalized, docs)
    if not selected_doc:
        selected_doc = docs[0] if len(docs) == 1 else None
    if not selected_doc:
        names = ", ".join(doc["filename"] for doc in docs)
        return {
            "answer": f"Please specify which document to summarize. Available documents: {names}.",
            "sources": [],
        }

    if is_topics:
        topics = selected_doc.get("key_topics", [])
        questions = selected_doc.get("suggested_questions", [])
        answer = "Key topics:\n" + "\n".join(f"- {topic}" for topic in topics)
        if questions:
            answer += "\n\nSuggested questions:\n" + "\n".join(f"- {q}" for q in questions)
    else:
        answer = (
            f"Overview:\n{selected_doc.get('overview', '')}\n\n"
            "Main points:\n"
            + "\n".join(f"- {point}" for point in selected_doc.get("main_points", []))
            + "\n\nKey topics:\n"
            + "\n".join(f"- {topic}" for topic in selected_doc.get("key_topics", []))
        )

    return {
        "answer": answer.strip(),
        "sources": [{
            "filename": selected_doc["filename"],
            "file": selected_doc["filename"],
            "chunk_id": "document-summary",
            "confidence_score": 1.0,
            "snippet": selected_doc.get("overview", "")[:180],
        }],
    }

def _select_document_for_question(question: str, docs: list[dict]) -> dict | None:
    for doc in docs:
        if doc["filename"].lower() in question:
            return doc
        stem = doc["filename"].rsplit(".", 1)[0].lower()
        if stem and stem in question:
            return doc
    return None

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
