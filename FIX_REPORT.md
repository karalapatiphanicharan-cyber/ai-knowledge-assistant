# Fix Report

Fix date: 2026-06-04

## Backend Fixes

- Added lazy loading for `google/flan-t5-small` so backend startup does not load the generation model until a query needs it.
- Added extractive fallback and answer/context overlap validation to reduce unsupported answers.
- Standardized the not-found response as `Information not found in uploaded documents.` when retrieval has no confident evidence.
- Added chunk-level source metadata: filename, chunk id, confidence score, and snippet.
- Added source-level replacement on upload so re-uploading the same filename does not create duplicate embeddings.
- Added document delete support and FAISS index rebuild after deleting chunks.
- Added document summary support with overview, main points, key topics, and suggested questions.
- Added document preview support using stored extracted chunks for TXT, DOCX, and PDF text.
- Changed vector persistence to `backend/data` independent of launch directory.
- Added structured document list output with chunk and character counts.

## Frontend Fixes

- Added multiple file upload support from both sidebar and chat input.
- Added upload progress display for multi-file queues.
- Added instant sidebar refresh after upload, delete, and clear operations.
- Added document delete, preview, and summary controls in the sidebar.
- Added collapsible sidebar behavior.
- Added reset session action that clears chat state without deleting documents.
- Moved export conversation to the sidebar and implemented clean TXT export.
- Added document preview/summary panel.
- Added better empty state, spacing, source cards, and loading/error panel states.
- Updated source rendering to show filename, chunk id, confidence score, and snippet.
- Removed misleading GPT-4 footer text and replaced it with a grounded-document disclaimer.

## Files Changed

- `backend/routes/query.py`
- `backend/routes/upload.py`
- `backend/services/llm.py`
- `backend/services/rag_pipeline.py`
- `backend/services/vector_db.py`
- `frontend/src/App.jsx`
- `frontend/src/api.js`
- `frontend/src/components/InputBar.jsx`
- `frontend/src/components/MessageBubble.jsx`
- `frontend/src/components/Sidebar.jsx`

## Notes

- Existing architecture was preserved.
- No experimental framework or storage redesign was introduced.
- The knowledge base was cleared after workflow tests, leaving no stale test document in the runtime index.
