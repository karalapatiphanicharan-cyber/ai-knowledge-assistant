import re
import logging

logger = logging.getLogger(__name__)
generator = None

def _get_generator():
    """Lazy-load the CPU text generation model only when a query needs it."""
    global generator
    if generator is None:
        try:
            from transformers import pipeline

            logger.info("[LLM] Loading google/flan-t5-small...")
            generator = pipeline("text2text-generation", model="google/flan-t5-small")
            logger.info("[LLM] Model ready.")
        except Exception as e:
            logger.error(f"[LLM] Error: {e}")
            generator = False
    return generator if generator is not False else None

def _clean_repetitive_sentences(text: str) -> str:
    """Post-processing to remove any sentences the model might have repeated."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    seen = set()
    result = []
    for s in sentences:
        s_strip = s.strip().lower()
        if s_strip and s_strip not in seen:
            result.append(s.strip())
            seen.add(s_strip)
    return " ".join(result)

def generate_answer(query: str, context: str) -> str:
    """
    High-quality, grounded answer generation with verification.
    """
    NOT_FOUND = "Information not found in uploaded documents."

    if not context or not context.strip():
        return NOT_FOUND

    # PRODUCTION GRADE PROMPT: Strictly grounded
    prompt = (
        f"Answer the question based only on the context provided. If not found, say '{NOT_FOUND}'.\n\n"
        f"Context: {context[:800]}\n\n"
        f"Question: {query}\n"
        f"Answer:"
    )

    try:
        active_generator = _get_generator()
        if active_generator is None:
            raise Exception("Model not loaded")

        result = active_generator(
            prompt, 
            max_length=96,
            do_sample=False, 
            repetition_penalty=1.2
        )
        
        answer = result[0]["generated_text"].strip()
        
        # --- Answer Verification Layer ---
        logger.info(f"[LLM] Raw answer: '{answer}'")

        lower_ans = answer.lower()

        # Hallucination detection: flan-t5 often falls back to common knowledge like "New Delhi"
        if "new delhi" in lower_ans and "india" not in context.lower() and "new delhi" not in context.lower():
             logger.warning("[LLM] Hallucination detected (New Delhi fallback).")
             return NOT_FOUND

        if not answer or len(answer) < 2 or "not found" in lower_ans or "i don't know" in lower_ans:
            return NOT_FOUND
            
        if _low_overlap(answer, context):
            return NOT_FOUND

        return answer

    except Exception as e:
        logger.error(f"[LLM] Error: {e}")
        return _extractive_answer(query, context)

def _low_overlap(answer: str, context: str) -> bool:
    answer_terms = set(re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", answer.lower()))
    context_terms = set(re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", context.lower()))
    if not answer_terms:
        return True
    return len(answer_terms & context_terms) / max(len(answer_terms), 1) < 0.45

def _extractive_answer(query: str, context: str) -> str:
    """Return relevant source sentences when generation is unavailable."""
    query_terms = set(re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", query.lower()))
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", context) if len(s.strip()) > 20]
    ranked = sorted(
        sentences,
        key=lambda sentence: len(query_terms & set(re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", sentence.lower()))),
        reverse=True,
    )
    chosen = [sentence for sentence in ranked[:3] if query_terms & set(re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", sentence.lower()))]
    if not chosen:
        return NOT_FOUND
    return " ".join(chosen)[:800]
