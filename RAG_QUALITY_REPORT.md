# RAG Quality Report

Date: 2026-06-04
Branch: `production-ready`

## Problems Found

- Summary requests were not handled by a dedicated summary path. The app could treat "Summarize this document" like a normal retrieval question.
- Document summary, key topics, and suggested questions were generated on demand instead of during upload.
- Chunking used fixed character windows, which could split paragraphs and sentences.
- Query retrieval used `top_k=5`, which was too narrow for long PDFs.
- Source citations were tied to returned chunks, but the backend response contract did not strongly separate document summaries from chunk citations.
- Preview rebuilt content from overlapping chunks, which could create duplicated or unreliable preview text.
- The small local generation model could return repeated or unsupported answers when the retrieved context was long.
- Similarity filtering was too rigid for long documents and could reject relevant chunks.

## Root Causes

- Summarization and question answering shared too much of the same runtime path.
- Document-level metadata was missing; only chunk-level metadata was persisted.
- Retrieval favored vector distance alone and did not boost exact section/page matches.
- The answer generator saw truncated context and was asked to synthesize answers even when extractive evidence was enough.
- Preview depended on chunk reconstruction instead of the original extracted document text.

## Fixes Applied

- Added upload-time document intelligence:
  - summary overview
  - main points
  - key topics
  - suggested questions
  - full extracted preview text
- Stored document intelligence in `backend/data/documents.json`, separate from chunk metadata, to avoid duplicating full text across chunks.
- Routed summary/topic intents directly to stored document intelligence:
  - "Summarize this PDF"
  - "Summarize this document"
  - "Give overview"
  - "What are the key topics?"
- Implemented paragraph-aware chunking with:
  - chunk size: 1000 characters
  - overlap: 200 characters
  - sentence-aware oversized block splitting
- Increased retrieval to `top_k=8`.
- Added lexical reranking on top of vector search.
- Added exact phrase boost for page and section queries such as "page 100" and "section 2".
- Made deterministic extractive answers the primary grounded QA path.
- Kept local LLM generation as a fallback instead of the default path.
- Returned source document, chunk id, confidence, and snippet for chunk-based answers.
- Returned `document-summary` as the source id for stored summaries.
- Changed preview to return stored extracted text for PDF, DOCX, and TXT.
- Added `backend/data/` to `.gitignore` so runtime indexes and metadata are not committed.

## Tests Performed

### Static Checks

- Backend compile:
  - `python -m py_compile backend\main.py backend\routes\upload.py backend\routes\query.py backend\services\rag_pipeline.py backend\services\vector_db.py backend\services\embedding.py backend\services\llm.py backend\utils\file_loader.py backend\utils\security.py`
- Frontend production build:
  - `npm run build`

### Backend API Workflow

Tested through FastAPI `TestClient`:

- Clear knowledge base
- Upload `ChatGPT.pdf`
- Ask "What is ChatGPT?"
- Ask "Summarize this document"
- Ask "What are the key topics?"
- Ask "Explain section 2"
- Preview PDF
- Summary API
- Delete document
- Upload/query 20-page PDF
- Upload/query 50-page PDF
- Upload/query 100-page PDF
- Preview TXT
- Preview DOCX
- Final clear knowledge base

### Live Local Server Workflow

Started and verified:

- Backend: `http://127.0.0.1:8000` returned HTTP 200
- Frontend: `http://127.0.0.1:5173` returned HTTP 200

Tested live backend over HTTP:

- Clear knowledge base
- Upload `ChatGPT.pdf`
- List documents
- Preview `ChatGPT.pdf`
- Summary for `ChatGPT.pdf`
- Ask "What is ChatGPT?"
- Ask "Summarize this document"
- Ask "What are the key topics?"
- Ask "Explain section 2"
- Delete `ChatGPT.pdf`
- Confirm document list empty
- Upload and query 100-page PDF
- Preview TXT
- Preview DOCX
- Final clear knowledge base

Browser smoke test:

- Opened `http://127.0.0.1:5173`
- Confirmed the app rendered with sidebar, upload, export, reset, clear, welcome state, and input bar.
- Screenshot saved as `frontend-smoke.png`.

## Results

- All static checks passed.
- All backend workflow tests passed.
- Live backend and frontend both ran successfully.
- `ChatGPT.pdf` upload, preview, summary, questions, delete, and clear all passed.
- 20-page, 50-page, and 100-page PDF retrieval tests passed.
- TXT and DOCX preview tests passed.
- Missing generated runtime data was cleared after tests.

## Performance Improvements

- Backend no longer duplicates full preview text in each chunk.
- Document-level intelligence is stored once per document.
- Summary requests avoid embedding search and generation after upload.
- QA uses extractive grounding first, reducing repeated local-model answers.
- LLM remains lazy-loaded and only used as fallback.
- Runtime FAISS data and metadata stay out of git.
