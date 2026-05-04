"""
KnowAI Backend — FastAPI application entry point.

Provides RAG-based document Q&A via file upload and query endpoints.
Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.upload import router as upload_router
from routes.query import router as query_router

app = FastAPI(
    title="KnowAI Backend",
    description="AI Knowledge Assistant — RAG-powered document Q&A API",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server to call the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Route registration
# ---------------------------------------------------------------------------
app.include_router(upload_router, prefix="/api", tags=["Upload"])
app.include_router(query_router, prefix="/api", tags=["Query"])


@app.get("/", tags=["Health"])
async def health_check():
    """Simple health-check endpoint."""
    return {
        "status": "healthy",
        "service": "KnowAI Backend",
        "version": "1.0.0",
    }
