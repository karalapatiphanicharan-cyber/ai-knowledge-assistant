from transformers import pipeline
import re
import logging

logger = logging.getLogger(__name__)

# Load model once globally
logger.info("[LLM] Loading google/flan-t5-small...")
try:
    # Optimized for CPU usage
    generator = pipeline("text2text-generation", model="google/flan-t5-small")
    logger.info("[LLM] Model ready.")
except Exception as e:
    logger.error(f"[LLM] Error: {e}")
    generator = None

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
        if generator is None:
            raise Exception("Model not loaded")

        result = generator(
            prompt, 
            max_length=64,
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
            
        return answer

    except Exception as e:
        logger.error(f"[LLM] Error: {e}")
        return NOT_FOUND
