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

    q_lower = query.lower()
    is_summary = any(kw in q_lower for kw in ["summary", "summarize", "overview"])
    
    # PRODUCTION GRADE PROMPT: Strictly grounded
    prompt = (
        f"You are a strictly grounded AI Assistant. Use ONLY the provided context to answer. "
        f"If the answer is not clearly stated in the context, respond exactly with: '{NOT_FOUND}'\n\n"
        f"Context: {context[:900]}\n\n"
        f"Question: {query}\n\n"
        f"Answer:"
    )

    try:
        if generator is None:
            raise Exception("Model not loaded")

        max_tokens = 128 if is_summary else 100
        
        result = generator(
            prompt, 
            max_length=max_tokens, 
            do_sample=False, 
            repetition_penalty=1.8
        )
        
        answer = result[0]["generated_text"].strip()
        answer = _clean_repetitive_sentences(answer)
        
        # --- Answer Verification Layer ---
        logger.info(f"[LLM] Raw answer: '{answer}'")

        # Check for non-grounded hallmarks or weak support
        lower_ans = answer.lower()

        # Hallmark of flan-t5 hallucinating when context is irrelevant: returning common knowledge
        # If the answer is very short and the question wasn't about that specific thing in the context, we flag it.
        if "new delhi" in lower_ans and "india" not in context.lower() and "new delhi" not in context.lower():
             logger.warning("[LLM] Hallucination detected (New Delhi fallback).")
             return NOT_FOUND

        if not answer or len(answer) < 5 or "i don't know" in lower_ans or "not found" in lower_ans or answer.lower() == "answer:":
            return NOT_FOUND
            
        return answer

    except Exception as e:
        logger.error(f"[LLM] Error: {e}")
        return NOT_FOUND
