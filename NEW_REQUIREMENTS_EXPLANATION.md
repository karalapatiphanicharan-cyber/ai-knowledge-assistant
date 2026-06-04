# New Requirements Explanation

## Dependencies Retained
- **fastapi**: Core web framework for the backend API.
- **uvicorn**: ASGI server for running the FastAPI application.
- **python-multipart**: Required by FastAPI for handling file uploads.
- **python-docx**: Used for extracting text from .docx files.
- **PyPDF2**: Used for extracting text from .pdf files.
- **sentence-transformers**: Provides the `all-MiniLM-L6-v2` model for generating text embeddings.
- **faiss-cpu**: Efficient vector similarity search library (CPU version).
- **numpy**: Required for numerical operations on embeddings.
- **pydantic**: Used for data validation and settings management.
- **transformers**: Library for the LLM (`google/flan-t5-small`) used in answer generation.
- **torch**: Core library for running AI models (CPU-only version specified by pruning GPU dependencies).

## Dependencies Removed
- **nvidia-* / cuda-* / triton**: Removed all GPU-specific libraries to ensure compatibility with standard Windows and CPU-only systems.
- **uvloop**: Removed as it is not compatible with Windows.
- **Other redundant packages**: Removed various sub-dependencies that are automatically handled by the primary packages listed above.
