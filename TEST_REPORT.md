# Test Report

Test date: 2026-06-04

## Automated Checks

| Check | Result |
| --- | --- |
| Frontend production build: `npm run build` | Passed |
| Backend Python compile: `python -m py_compile ...` | Passed |
| Vite dev server response on `http://127.0.0.1:5173` | Passed, HTTP 200 |

## Backend Workflow Test

Used FastAPI `TestClient` with a small TXT document.

| Workflow | Result |
| --- | --- |
| Clear knowledge base | Passed |
| Upload TXT | Passed |
| List documents | Passed |
| Preview document | Passed |
| Generate summary | Passed |
| Ask answerable question | Passed; returned grounded answer with source metadata |
| Ask missing-information question | Passed; returned `Information not found in uploaded documents.` |
| Delete document | Passed |
| Confirm sidebar data source empty after delete | Passed |
| Final clear knowledge base | Passed |

## Format Extraction Tests

| Format | Result |
| --- | --- |
| TXT | Passed through upload workflow |
| DOCX | Passed direct extraction test with `python-docx` |
| PDF | Passed direct extraction test with a generated minimal PDF and PyPDF2 |

## Observed Runtime Output

- Query for known text returned answer `Maya` with source `atlas.txt#1`.
- Query for missing office address returned exactly `Information not found in uploaded documents.` with no sources.
- CPU model loaded successfully during the first query.

## Limitations

- Browser visual inspection through the Codex in-app browser was not available in the current callable tool set. Vite served successfully and the production build passed.
- DOCX and PDF upload endpoints use the same upload path as TXT; extraction was verified directly for those formats to avoid adding test-only dependencies.
