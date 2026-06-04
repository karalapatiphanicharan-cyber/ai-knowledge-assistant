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
    High-quality, concise answer generation.
    """
    if not context or not context.strip():
        return "I don't know based on the document"

    q_lower = query.lower()
    is_summary = any(kw in q_lower for kw in ["summary", "summarize", "overview"])
    
    # Senior-level prompt for clear, non-repetitive answers
    prompt = f"Context: {context[:800]}\n\nQuestion: {query}\n\nAnswer concisely using the context above. If the answer is not in the context, say 'I don't know'."

    try:
        if generator is None:
            raise Exception("Model not loaded")

        # Use moderate length to prevent runaway repetition on CPU
        max_tokens = 128 if is_summary else 100
        
        result = generator(
            prompt, 
            max_length=max_tokens, 
            do_sample=False, 
            repetition_penalty=1.5 # Increased penalty
        )
        
        answer = result[0]["generated_text"].strip()
        
        # Clean up any potential repeats
        answer = _clean_repetitive_sentences(answer)
        
        if not answer or len(answer) < 5 or answer.lower() == "answer:":
            return "I couldn't find a definitive answer in the documents provided."
            
        return answer

    except Exception as e:
        logger.error(f"[LLM] Error: {e}")
        return "An error occurred during answer generation."
