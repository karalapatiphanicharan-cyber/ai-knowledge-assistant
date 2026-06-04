"""
Upload route — accepts PDF, TXT, and DOCX files, extracts text,
chunks it, generates embeddings, and stores them in the vector DB.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.file_loader import extract_text
from utils.security import sanitize_filename
from services.rag_pipeline import ingest_document, get_doc_summary
from services.vector_db import clear_index, get_unique_sources, remove_document, get_stats, get_document_preview

router = APIRouter()

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}


def _get_extension(filename: str) -> str:
    """Return the lowercase file extension without the dot."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a document to the knowledge base.
    """
    ext = _get_extension(sanitize_filename(file.filename))
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()

    try:
        text = extract_text(contents, ext)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to extract text: {exc}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="The uploaded file contains no extractable text.")

    # Check if duplicate
    existing = get_unique_sources()
    safe_name = sanitize_filename(file.filename)
    if safe_name in existing:
         raise HTTPException(status_code=400, detail=f"Document '{safe_name}' already exists.")

    num_chunks = ingest_document(text, source=safe_name)

    return {
        "status": "success",
        "filename": safe_name,
        "chunks_stored": num_chunks,
        "message": f"Successfully processed and stored {num_chunks} chunks from '{safe_name}'.",
    }

@router.post("/clear")
async def clear_knowledge_base():
    """Wipe the entire knowledge base."""
    clear_index()
    return {"status": "success", "message": "Knowledge base cleared successfully."}

@router.get("/documents")
async def list_documents():
    """Return a list of unique documents."""
    docs = get_unique_sources()
    return {"documents": docs}

@router.delete("/documents/{filename}")
async def delete_document(filename: str):
    """Remove a specific document."""
    success = remove_document(filename)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"status": "success", "message": f"Document '{filename}' removed."}

@router.get("/stats")
async def fetch_stats():
    """Return KB statistics."""
    return get_stats()

@router.get("/documents/{filename}/preview")
async def preview_doc(filename: str):
    """Return a preview of the document."""
    preview = get_document_preview(filename)
    if not preview:
        raise HTTPException(status_code=404, detail="Document not found.")
    return preview

@router.get("/summary")
async def doc_summary(filename: str = None):
    """Generate summary and suggestions."""
    return get_doc_summary(filename)
