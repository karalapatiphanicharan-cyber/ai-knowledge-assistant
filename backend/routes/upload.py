"""
Upload route — accepts PDF, TXT, and DOCX files, extracts text,
chunks it, generates embeddings, and stores them in the vector DB.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.file_loader import extract_text
from utils.security import sanitize_filename
from services.rag_pipeline import ingest_document
from services.vector_db import clear_index

router = APIRouter()

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}


def _get_extension(filename: str) -> str:
    """Return the lowercase file extension without the dot."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a document to the knowledge base.

    Accepted formats: PDF, TXT, DOCX.
    The file is read, text is extracted, chunked, embedded,
    and stored in the FAISS vector database.
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

    num_chunks = ingest_document(text, source=sanitize_filename(file.filename))

    return {
        "status": "success",
        "filename": sanitize_filename(file.filename),
        "chunks_stored": num_chunks,
        "message": f"Successfully processed and stored {num_chunks} chunks from '{sanitize_filename(file.filename)}'.",
    }

@router.delete("/clear")
async def clear_knowledge_base():
    """
    Wipe the entire knowledge base (index and files).
    """
    clear_index()
    return {"status": "success", "message": "Knowledge base cleared successfully."}
