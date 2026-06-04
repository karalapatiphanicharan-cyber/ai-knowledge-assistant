from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.rag_pipeline import query_knowledge_base, search_snippets
from services.llm import generator
from services.vector_db import _index

router = APIRouter()

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)

class SourceItem(BaseModel):
    file: str
    score: float
    chunk_id: int

class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    confidence: str
    is_summary: bool = False
    summary_data: dict = None

@router.post("/query", response_model=QueryResponse)
async def query_documents(payload: QueryRequest):
    try:
        result = query_knowledge_base(payload.question)
        return QueryResponse(**result)
    except Exception as e:
        return QueryResponse(
            answer="Error searching documents.",
            sources=[],
            confidence="Low"
        )

@router.get("/search-snippets")
async def search_docs(q: str):
    return {"results": search_snippets(q)}

@router.get("/system-status")
async def system_status():
    return {
        "backend": "Online",
        "embedding_model": "Loaded" if generator is not None else "Error",
        "vector_db": "Ready" if _index is not None else "Initializing"
    }
