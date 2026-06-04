# Startup Guide

## Prerequisites
- **Python**: 3.11+
- **Node.js**: 18+ (for frontend)
- **RAM**: 8GB recommended

## Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Setup
- No specific environment variables are required for basic CPU execution.
- Ensure you have a stable internet connection for the first run to download the embedding and LLM models.
