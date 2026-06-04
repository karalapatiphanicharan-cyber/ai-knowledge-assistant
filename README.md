# KnowAI – AI Knowledge Assistant

KnowAI is a Retrieval-Augmented Generation (RAG) based AI Knowledge Assistant that allows users to upload documents and ask questions based on their content. The system extracts information from PDFs, TXT, and DOCX files, indexes the content, and provides accurate document-grounded answers using local AI models.

## Features

- Upload PDF, TXT, and DOCX documents
- AI-powered document question answering
- Automatic document summarization
- Document preview and key insights
- Semantic search with vector embeddings
- Source-grounded responses with confidence scores
- Delete individual documents
- Clear entire knowledge base
- Dark modern UI
- Fast local processing with Ollama support

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI

### AI & RAG
- Ollama
- FAISS Vector Database
- Sentence Transformers
- Retrieval-Augmented Generation (RAG)

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
├── README.md
└── requirements.txt
```

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/ai-knowledge-assistant.git
cd ai-knowledge-assistant
```

### Backend Setup

```bash
cd backend

pip install -r requirements.txt

python main.py
```

Backend runs at:

```text
http://127.0.0.1:8000
```

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at:

```text
http://127.0.0.1:5173
```

## Ollama Setup

Install Ollama:

https://ollama.com

Pull a model:

```bash
ollama pull qwen2.5:7b
```

or

```bash
ollama pull llama3:8b
```

Start Ollama:

```bash
ollama serve
```

## Usage

1. Start Backend
2. Start Frontend
3. Upload a document
4. Generate summary
5. Ask questions about the document
6. View sources used in answers
7. Delete documents or clear the knowledge base when needed

## Example Questions

```text
Summarize this document

What are the main points?

What does the document say about training?

What conclusions are mentioned?

Explain chapter 3
```

## RAG Workflow

```text
Document Upload
        ↓
Text Extraction
        ↓
Chunking
        ↓
Embedding Generation
        ↓
FAISS Vector Storage
        ↓
Semantic Retrieval
        ↓
LLM Response Generation
        ↓
Grounded Answer with Sources
```

## Current Capabilities

- Multi-document support
- Large PDF processing
- Document summaries
- Semantic retrieval
- Context-aware answers
- Source attribution
- Local AI inference

## Future Improvements

- Chat history persistence
- Multi-user authentication
- Hybrid search (Keyword + Vector)
- Advanced PDF viewer
- Conversation memory
- Cloud deployment support

## Release

Current Stable Version:

```text
v1.1-rag-fixed
```

## License

MIT License

## Author

Phani Charan

B.Tech CSE (AI & ML)

Passionate about Artificial Intelligence, Machine Learning, and Quantum Computing.
