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
    Uses a more descriptive prompt to encourage longer responses.
    """
    NOT_FOUND = "Information not found in uploaded documents."

    if not context or not context.strip():
        return NOT_FOUND

    # PRODUCTION GRADE PROMPT: Strictly grounded but descriptive
    prompt = (
        f"You are a professional AI Assistant. Answer the question comprehensively using ONLY the provided context.\n\n"
        f"Context: {context[:1200]}\n\n"
        f"Question: {query}\n\n"
        f"Instructions:\n"
        f"- Provide a detailed and informative explanation.\n"
        f"- Use multiple pieces of information from the context if relevant.\n"
        f"- If the answer is not in the context, say exactly: '{NOT_FOUND}'\n\n"
        f"Answer:"
    )

    try:
        if generator is None:
            raise Exception("Model not loaded")

        result = generator(
            prompt, 
            max_length=200,
            do_sample=False, 
            repetition_penalty=1.5
        )
        
        answer = result[0]["generated_text"].strip()
        answer = _clean_repetitive_sentences(answer)
        
        logger.info(f"[LLM] Raw answer: '{answer}'")

        lower_ans = answer.lower()
        if "new delhi" in lower_ans and "india" not in context.lower() and "new delhi" not in context.lower():
             return NOT_FOUND

        if not answer or len(answer) < 3 or "not found" in lower_ans or "i don't know" in lower_ans:
            return NOT_FOUND
            
        return answer

    except Exception as e:
        logger.error(f"[LLM] Error: {e}")
        return NOT_FOUND

def generate_summary(context: str) -> dict:
    """Generate a structured summary of the document."""
    if not context or not context.strip():
        return {"overview": "No content available.", "topics": [], "facts": [], "takeaways": []}

    prompt = (
        f"Analyze the text below and provide a professional summary.\n\n"
        f"Text: {context[:1500]}\n\n"
        f"Return the following sections:\n"
        f"Overview: (1-2 sentences)\n"
        f"Key Topics: (comma separated list)\n"
        f"Important Facts: (bullet points)\n"
        f"Main Takeaways: (1 sentence)\n"
    )

    try:
        if generator is None:
            return {"overview": "Model not loaded", "topics": [], "facts": [], "takeaways": []}

        result = generator(prompt, max_length=256, do_sample=False)
        text = result[0]["generated_text"].strip()

        # Crude parsing for flan-t5
        overview = "Extracted from document."
        topics = []
        facts = []
        takeaways = "Check the document for details."

        parts = re.split(r'(Overview|Key Topics|Important Facts|Main Takeaways):', text, flags=re.IGNORECASE)
        for i in range(1, len(parts), 2):
            label = parts[i].lower()
            content = parts[i+1].strip()
            if 'overview' in label: overview = content
            elif 'topics' in label: topics = [t.strip() for t in content.split(',')]
            elif 'facts' in label: facts = [f.strip() for f in content.split('\n') if f.strip()]
            elif 'takeaways' in label: takeaways = content

        return {
            "overview": overview,
            "topics": topics[:5],
            "facts": facts[:5],
            "takeaways": takeaways
        }
    except Exception as e:
        logger.error(f"[LLM Summary] Error: {e}")
        return {"overview": "Error generating summary.", "topics": [], "facts": [], "takeaways": []}

def suggest_questions(context: str) -> list[str]:
    """Suggest 5 professional, document-specific questions."""
    if not context or not context.strip():
        return ["What is this document about?"]

    prompt = (
        f"Generate 5 unique, insightful questions based on the text below.\n\n"
        f"Text: {context[:1000]}\n\n"
        f"Questions:"
    )

    try:
        if generator is None:
            return ["What is this document about?"]

        result = generator(prompt, max_length=150, do_sample=False)
        text = result[0]["generated_text"].strip()

        # Find lines with questions
        questions = [q.strip() for q in re.split(r'\d\.', text) if '?' in q]
        if not questions:
            # Fallback if parsing fails
            return ["Summarize this document.", "What are the key findings?", "What is the main purpose?", "Are there any limitations?", "What are the conclusions?"]

        return questions[:5]
    except Exception as e:
        logger.error(f"[LLM Suggestions] Error: {e}")
        return ["What are the key points?"]
