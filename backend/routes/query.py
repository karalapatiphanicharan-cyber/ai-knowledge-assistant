"""
Query route — stable API endpoint for the AI Knowledge Assistant.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.rag_pipeline import query_knowledge_base
from services.llm import generator
from services.vector_db import _index

router = APIRouter()

class QueryRequest(BaseModel):
    """Schema for incoming query requests."""
    question: str = Field(..., min_length=1)

class SourceItem(BaseModel):
    """Structured source information."""
    file: str
    snippet: str
    score: float
    chunk_id: int

class QueryResponse(BaseModel):
    """Assistant-quality response schema."""
    answer: str
    sources: list[SourceItem]
    confidence: str

@router.post("/query", response_model=QueryResponse)
async def query_documents(payload: QueryRequest):
    """
    Handle user queries with structured assistant-quality responses.
    """
    try:
        print(f"[API] Query: {payload.question[:50]}...")
        result = query_knowledge_base(payload.question)
        
        return QueryResponse(
            answer=result["answer"],
            sources=[SourceItem(**s) for s in result["sources"]],
            confidence=result.get("confidence", "Low")
        )
    except Exception as e:
        print(f"[API] Error: {e}")
        return QueryResponse(
            answer="I encountered an error while searching your documents.",
            sources=[],
            confidence="Low"
        )

@router.get("/system-status")
async def system_status():
    """Return live system status."""
    return {
        "backend": "Online",
        "embedding_model": "Loaded" if generator is not None else "Error",
        "vector_db": "Ready" if _index is not None else "Initializing"
    }
