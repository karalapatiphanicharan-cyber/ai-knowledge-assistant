# KnowAI – AI Knowledge Assistant

> AI-powered Knowledge Assistant that allows users to upload documents, generate summaries, and ask questions grounded in document content using Retrieval-Augmented Generation (RAG).

---

## Features

- Upload PDF, TXT, and DOCX documents
- AI-generated document summaries
- Ask questions about uploaded documents
- Source-grounded answers
- Semantic search with vector embeddings
- Document preview
- Delete individual documents
- Clear entire knowledge base
- Modern responsive UI
- Fast document retrieval using RAG

---

## Demo Workflow

```text
Upload Document
       ↓
Text Extraction
       ↓
Chunking
       ↓
Vector Embeddings
       ↓
FAISS Vector Database
       ↓
Semantic Retrieval
       ↓
AI Generated Answer
```

---

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- FastAPI
- Python

### AI & RAG
- Google Gemini API
- Sentence Transformers
- FAISS Vector Database
- Retrieval-Augmented Generation (RAG)

---

## Project Structure

```text
ai-knowledge-assistant/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── data/
│   └── main.py
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── public/
│
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/karalapatiphanicharan-cyber/ai-knowledge-assistant.git

cd ai-knowledge-assistant
```

---

## Backend Setup

Open Terminal 1

```bash
cd backend

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

---

## Frontend Setup

Open Terminal 2

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at:

```text
http://127.0.0.1:5173
```

---

## Environment Variables

Create a `.env` file inside the backend folder:

```env
GEMINI_API_KEY=your_api_key_here
```

---

## Usage

1. Start the backend server
2. Start the frontend server
3. Upload a document
4. Generate a summary
5. Ask questions related to the document
6. View sources used for answers
7. Delete documents when needed
8. Clear the knowledge base to start fresh

---

## Example Questions

### General

```text
Summarize this document
```

```text
What are the main points?
```

```text
Give me the key topics discussed.
```

```text
What is the conclusion of this document?
```

---

### Technical Documents

```text
Explain the architecture described in the document.
```

```text
What technologies are mentioned?
```

```text
What are the advantages discussed?
```

```text
Summarize the implementation section.
```

---

### Research Papers

```text
What problem does this paper solve?
```

```text
What methodology was used?
```

```text
What are the experimental results?
```

```text
What future work is suggested?
```

---

### Resume Analysis

```text
Summarize this resume.
```

```text
What skills does the candidate have?
```

```text
What projects are mentioned?
```

```text
Is this candidate suitable for an AI/ML role?
```

---

### Large PDFs

```text
What is discussed in chapter 1?
```

```text
What is discussed in chapter 5?
```

```text
Summarize the conclusion section.
```

```text
What are the key findings?
```

---

## Key Capabilities

- Multi-document support
- PDF, TXT, and DOCX processing
- AI-powered summarization
- Context-aware document Q&A
- Source attribution
- Semantic search
- Vector database retrieval
- Large document handling

---

## Future Improvements

- Multi-user authentication
- Chat history persistence
- Hybrid search (Keyword + Vector)
- Cloud deployment
- Advanced document viewer
- Conversation memory

---

## Release

Current Stable Version:

```text
v1.1-rag-fixed
```

---

## Author

**Phani Charan**

B.Tech – Computer Science Engineering (AI & ML)

Interested in:
- Artificial Intelligence
- Machine Learning
- Retrieval-Augmented Generation (RAG)
- Quantum Computing

---

## License

MIT License
