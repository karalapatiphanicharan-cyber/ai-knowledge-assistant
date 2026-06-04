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

    extractive = _extractive_answer(query, context)
    if extractive != NOT_FOUND:
        return extractive

    # PRODUCTION GRADE PROMPT: Strictly grounded
    prompt = (
        f"Answer the question based only on the context provided. If not found, say '{NOT_FOUND}'.\n\n"
        f"Context: {context[:4000]}\n\n"
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
            return extractive
            
        if _low_overlap(answer, context):
            return extractive

        return answer

    except Exception as e:
        logger.error(f"[LLM] Error: {e}")
        return extractive

def _low_overlap(answer: str, context: str) -> bool:
    answer_terms = set(re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", answer.lower()))
    context_terms = set(re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", context.lower()))
    if not answer_terms:
        return True
    return len(answer_terms & context_terms) / max(len(answer_terms), 1) < 0.45

def _extractive_answer(query: str, context: str) -> str:
    """Return relevant source sentences when generation is unavailable."""
    query_terms = set(re.findall(r"\b[a-zA-Z0-9][a-zA-Z0-9-]{1,}\b", query.lower()))
    query_terms -= {"what", "does", "this", "that", "with", "from", "give", "show", "tell", "about"}
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", context) if len(s.strip()) > 20]

    phrase_boosts = []
    for match in re.findall(r"\b(?:page|section)\s+\d+\b", query.lower()):
        phrase_boosts.append(match)

    def score_sentence(sentence: str) -> int:
        lower_sentence = sentence.lower()
        terms = set(re.findall(r"\b[a-zA-Z0-9][a-zA-Z0-9-]{1,}\b", lower_sentence))
        score = len(query_terms & terms)
        score += sum(5 for phrase in phrase_boosts if re.search(rf"\b{re.escape(phrase)}\b", lower_sentence))
        return score

    if phrase_boosts:
        exact_matches = [
            sentence for sentence in sentences
            if any(re.search(rf"\b{re.escape(phrase)}\b", sentence.lower()) for phrase in phrase_boosts)
        ]
        if exact_matches:
            sentences = exact_matches

    ranked = sorted(sentences, key=score_sentence, reverse=True)
    chosen = [_strip_context_label(sentence) for sentence in ranked[:3] if score_sentence(sentence) > 0]
    if not chosen:
        return NOT_FOUND
    return " ".join(chosen)[:800]

def _strip_context_label(sentence: str) -> str:
    return re.sub(r"^\[[^\]]+\]\s*", "", sentence).strip()
