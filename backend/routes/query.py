"""
Query route — stable API endpoint for the AI Knowledge Assistant.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.rag_pipeline import query_knowledge_base

router = APIRouter()

class QueryRequest(BaseModel):
    """Schema for incoming query requests."""
    question: str = Field(..., min_length=1)

class SourceItem(BaseModel):
    """Structured source information."""
    filename: str
    file: str | None = None
    chunk_id: str
    confidence_score: float
    snippet: str
    chunk_index: int | None = None
    chunk_count: int | None = None
    retrieved_chunk_count: int | None = None
    similarity_score: float | None = None

class QueryResponse(BaseModel):
    """Assistant-quality response schema."""
    answer: str
    sources: list[SourceItem]

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
            sources=[SourceItem(**s) for s in result["sources"]]
        )
    except Exception as e:
        print(f"[API] Error: {e}")
        return QueryResponse(
            answer="Information not found in uploaded documents.",
            sources=[]
        )
