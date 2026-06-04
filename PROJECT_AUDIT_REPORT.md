# Project Audit Report

Audit date: 2026-06-04

## Summary

The frontend production build and backend Python compile passed before changes, but several required product features were missing or incomplete. The highest-risk issues were stale document state, no single-document delete API, no preview/summary endpoints, eager LLM loading during backend import, mismatched source metadata between backend and frontend, and no strict frontend support for multiple uploads or exported conversations from the sidebar.

## Problems Found

| Area | Problem | Root cause | Severity | Fix plan |
| --- | --- | --- | --- | --- |
| Backend startup | Text generation model loaded during module import | `services/llm.py` initialized the Hugging Face pipeline globally | High | Lazy-load the model on first query and keep CPU compatibility |
| Document management | Delete document feature missing | No backend route or vector-store source removal function | High | Add source-level delete API and rebuild FAISS index after deletion |
| Document management | Sidebar could show stale data after changes | Document list returned filenames only and frontend only refreshed after upload | High | Return structured document summaries and refresh after upload/delete/clear |
| Upload | Multiple file upload incomplete | File inputs read only `files[0]` | High | Accept `multiple` inputs and process a sequential upload queue |
| Retrieval | Source response schema mismatch | RAG returned `score`; API schema expected only `file` and `snippet` | High | Return `filename`, `chunk_id`, `confidence_score`, and snippets consistently |
| Retrieval | Sources could be too broad | Previous logic deduplicated by file, hiding chunk-level evidence | Medium | Show only chunks used after similarity filtering |
| Retrieval | Hallucination guard was partial | Generation fallback could still produce unsupported text | High | Keep similarity threshold, add answer/context overlap validation, and return the required not-found message |
| Preview | Preview button had no backend support | No preview route or extracted text retrieval function | High | Add preview endpoint backed by stored chunks |
| Summary | Summary/suggested questions missing | No summary route or document-specific topic extraction | Medium | Add deterministic document summary endpoint with overview, points, topics, and questions |
| Export | Export conversation not in sidebar | No export action existed | Medium | Add sidebar export button producing clean TXT |
| Session | Reset session missing | No frontend action to clear chat without deleting documents | Medium | Add reset action that preserves documents and clears chat state |
| Performance | Duplicate embeddings possible for same filename | Upload appended chunks for duplicate source names | Medium | Replace existing source chunks on upload |
| Persistence | Data directory depended on launch cwd | Vector DB used relative `data` path | Medium | Resolve data path relative to `backend` |
| UI/UX | Sidebar not collapsible | No collapsed state/control | Medium | Add collapse toggle and compact mode |
| UI/UX | Source display lacked chunk/confidence details | Source UI showed simple tags only | Medium | Add source cards with filename, chunk id, confidence, and snippet |
| UI/UX | Footer claimed GPT-4 | Backend uses local models | Low | Replace with grounded-document disclaimer |

## Baseline Checks

- `npm run build` passed before fixes.
- `python -m py_compile` passed before fixes.
- Functional audit still found missing feature routes, incomplete state updates, and source contract drift.

## Stability Fix Plan Applied

- Preserve the existing FastAPI + React + FAISS architecture.
- Add missing document lifecycle operations without redesigning storage.
- Keep local CPU model behavior and avoid unnecessary startup loading.
- Make the frontend reflect backend state immediately after every document mutation.
- Add reports and verification without committing generated knowledge-base contents.
