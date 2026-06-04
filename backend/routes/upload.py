from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.file_loader import extract_text
from utils.security import sanitize_filename
from services.rag_pipeline import ingest_document, get_doc_summary
from services.vector_db import clear_index, get_unique_sources, remove_document, get_stats, get_document_preview, get_all_chunks

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        ext = file.filename.rsplit(".", 1)[-1].lower()
        contents = await file.read()
        size_kb = round(len(contents) / 1024, 2)
        text = extract_text(contents, ext)

        if not text.strip():
            raise ValueError("No extractable text.")

        safe_name = sanitize_filename(file.filename)
        if safe_name in get_unique_sources():
             raise ValueError("Document already exists.")

        num_chunks = ingest_document(text, source=safe_name)
        chunks = get_all_chunks()
        for chunk in chunks:
            if chunk["source"] == safe_name:
                chunk["size_kb"] = size_kb
        return {"status": "success", "filename": safe_name, "chunks_stored": num_chunks}
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/clear")
async def clear_knowledge_base():
    clear_index()
    return {"status": "success", "message": "Knowledge base cleared."}

@router.get("/documents")
async def list_documents():
    docs_metadata = []
    seen = set()
    chunks = get_all_chunks()
    for chunk in chunks:
        source = chunk["source"]
        if source not in seen:
            docs_metadata.append({
                "id": source,
                "name": source,
                "size_kb": chunk.get("size_kb", 0),
                "timestamp": chunk.get("timestamp", "Unknown"),
                "chunk_count": len([c for c in chunks if c["source"] == source])
            })
            seen.add(source)
    return {"documents": docs_metadata}

@router.delete("/document/{filename}")
async def delete_document(filename: str):
    if remove_document(filename):
        return {"status": "success", "message": f"Document {filename} deleted."}
    raise HTTPException(status_code=404, detail="Document not found.")

@router.get("/stats")
async def fetch_stats():
    return get_stats()

@router.get("/document/{filename}/preview")
async def preview_doc(filename: str):
    preview = get_document_preview(filename)
    if not preview: raise HTTPException(status_code=404, detail="Preview unavailable.")
    return preview

@router.get("/document/{filename}/summary")
async def doc_summary(filename: str):
    summary = get_doc_summary(filename)
    if "error" in summary: raise HTTPException(status_code=404, detail=summary["error"])
    return summary
