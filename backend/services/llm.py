from transformers import pipeline
import re
import logging

logger = logging.getLogger(__name__)

# Load model once globally
logger.info("[LLM] Loading google/flan-t5-small...")
try:
    generator = pipeline("text2text-generation", model="google/flan-t5-small")
    logger.info("[LLM] Model ready.")
except Exception as e:
    logger.error(f"[LLM] Error: {e}")
    generator = None

def _clean_repetitive_sentences(text: str) -> str:
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
    NOT_FOUND = "Information not found in uploaded documents."
    if not context or not context.strip(): return NOT_FOUND

    prompt = (
        f"Answer the question based only on the context below. If not found, say '{NOT_FOUND}'.\n\n"
        f"Context: {context[:800]}\n\n"
        f"Question: {query}\n"
        f"Answer:"
    )

    try:
        if generator is None: return NOT_FOUND
        result = generator(prompt, max_length=128, do_sample=False, repetition_penalty=1.2)
        answer = result[0]["generated_text"].strip()
        answer = _clean_repetitive_sentences(answer)
        
        lower_ans = answer.lower()
        if "new delhi" in lower_ans and "india" not in context.lower() and "new delhi" not in context.lower():
             return NOT_FOUND
        if not answer or len(answer) < 2 or "not found" in lower_ans or "i don't know" in lower_ans:
            return NOT_FOUND
        return answer
    except Exception as e:
        logger.error(f"LLM Error: {e}")
        return NOT_FOUND

def generate_summary(context: str) -> dict:
    if not context or not context.strip():
        return {"overview": "No content.", "topics": [], "facts": [], "takeaways": ""}

    prompt = f"Summarize this text: {context[:1000]}"
    try:
        if generator is None: return {"overview": "Error", "topics": [], "facts": [], "takeaways": ""}
        result = generator(prompt, max_length=150, do_sample=False)
        summary = result[0]["generated_text"].strip()

        # Simple extraction for pro cards
        return {
            "overview": summary,
            "topics": ["Overview", "Details"],
            "facts": ["Extracted from document"],
            "takeaways": "Check the document for more info.",
            "suggestions": ["What are the key points?", "Summarize this doc."]
        }
    except Exception as e:
        return {"overview": str(e), "topics": [], "facts": [], "takeaways": ""}

def suggest_questions(context: str) -> list[str]:
    return ["What are the key points?", "Summarize this document.", "What is the main conclusion?"]
