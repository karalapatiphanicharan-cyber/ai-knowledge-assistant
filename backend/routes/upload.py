from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.file_loader import extract_text
from utils.security import sanitize_filename
from services.rag_pipeline import ingest_document, get_doc_summary
from services.vector_db import clear_index, get_unique_sources, remove_document, get_stats, get_document_preview, _chunks

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    contents = await file.read()
    size_kb = round(len(contents) / 1024, 2)

    try:
        text = extract_text(contents, ext)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to extract text: {exc}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="No extractable text.")

    safe_name = sanitize_filename(file.filename)
    if safe_name in get_unique_sources():
         raise HTTPException(status_code=400, detail="Document already exists.")

    num_chunks = ingest_document(text, source=safe_name)

    # Add size info to metadata (hacky since ingest_document adds vectors)
    # Better would be to update vector_db.py but I'll stick to current structure
    for chunk in _chunks:
        if chunk["source"] == safe_name:
            chunk["size_kb"] = size_kb

    return {"status": "success", "filename": safe_name, "chunks_stored": num_chunks}

@router.post("/clear")
async def clear_knowledge_base():
    clear_index()
    return {"status": "success"}

@router.get("/documents")
async def list_documents():
    docs_metadata = []
    seen = set()
    for chunk in _chunks:
        if chunk["source"] not in seen:
            docs_metadata.append({
                "name": chunk["source"],
                "size_kb": chunk.get("size_kb", 0),
                "timestamp": chunk.get("timestamp", "Unknown")
            })
            seen.add(chunk["source"])
    return {"documents": docs_metadata}

@router.delete("/documents/{filename}")
async def delete_document(filename: str):
    if remove_document(filename):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Not found")

@router.get("/stats")
async def fetch_stats():
    return get_stats()

@router.get("/documents/{filename}/preview")
async def preview_doc(filename: str):
    preview = get_document_preview(filename)
    if not preview: raise HTTPException(status_code=404)
    return preview

@router.get("/summary")
async def doc_summary(filename: str = None):
    return get_doc_summary(filename)
