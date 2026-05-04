from transformers import pipeline
import re

# Load model once globally
print("[LLM] Loading google/flan-t5-small...")
try:
    # Optimized for CPU usage
    generator = pipeline("text2text-generation", model="google/flan-t5-small")
    print("[LLM] Model ready.")
except Exception as e:
    print(f"[LLM] Error: {e}")
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
    prompt = f"""You are a helpful AI Assistant.
Answer the question using ONLY the context below. 

Instructions:
- Be concise and direct.
- Do NOT repeat the same sentence.
- Summarize clearly.
- If not found, say 'I don't know'.

Context:
{context[:1000]}

Question: {query}
Answer:"""

    try:
        if generator is None:
            raise Exception("Model not loaded")

        # Use moderate length to prevent runaway repetition on CPU
        max_tokens = 128 if is_summary else 100
        
        result = generator(
            prompt, 
            max_length=max_tokens, 
            do_sample=False, 
            repetition_penalty=1.2 # Prevent the model from repeating itself
        )
        
        answer = result[0]["generated_text"].strip()
        
        # Clean up any potential repeats
        answer = _clean_repetitive_sentences(answer)
        
        if not answer or len(answer) < 10:
            return context[:250] + "..."
            
        return answer

    except Exception as e:
        print(f"[LLM] Error: {e}")
        return context[:200] + "..."
