"""
File loader utility — extracts plain text from uploaded files.

Supported formats: PDF, TXT, DOCX.
"""

import io
from PyPDF2 import PdfReader
from docx import Document


def extract_text(file_bytes: bytes, extension: str) -> str:
    """
    Extract text content from raw file bytes based on the file extension.

    Args:
        file_bytes: The raw bytes of the uploaded file.
        extension: Lowercase file extension without the dot (e.g. "pdf").

    Returns:
        The extracted text as a single string.

    Raises:
        ValueError: If the extension is not supported.
    """
    extractors = {
        "pdf": _extract_pdf,
        "txt": _extract_txt,
        "docx": _extract_docx,
    }

    extractor = extractors.get(extension)
    if extractor is None:
        raise ValueError(f"Unsupported file extension: '{extension}'")

    return extractor(file_bytes)


def _extract_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n\n".join(pages)


def _extract_txt(file_bytes: bytes) -> str:
    """Extract text from a plain-text file."""
    return file_bytes.decode("utf-8", errors="replace")


def _extract_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file."""
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
    return "\n\n".join(paragraphs)
