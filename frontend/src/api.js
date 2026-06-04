/**
 * API client for communicating with the KnowAI FastAPI backend.
 * Optimized for speed, error handling, and timeout protection.
 */

// Use local backend by default
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/**
 * Helper to handle fetch with a timeout.
 * Prevents the app from hanging if the backend is slow.
 */
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 15000 } = options; // 15s timeout
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The backend might be busy.');
    }
    throw error;
  }
}

/**
 * Send a question to the RAG query endpoint.
 * @param {string} question - The user's question
 * @returns {Promise<{answer: string, sources: Array<object>}>}
 */
export async function queryDocuments(question) {
  console.log(`[API] Querying: "${question.substring(0, 50)}..."`);
  
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      timeout: 90000 // CPU inference can be slow, especially on first run
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error("[API] Query failed:", err);
    throw err;
  }
}

/**
 * Upload a document (PDF, TXT, DOCX) to the knowledge base.
 * @param {File} file - The file to upload
 * @returns {Promise<{status: string, filename: string, chunks_stored: number, message: string}>}
 */
export async function uploadDocument(file) {
  console.log(`[API] Uploading: ${file.name}`);
  
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/upload`, {
      method: "POST",
      body: formData,
      timeout: 60000 // Large PDFs need more time
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Upload failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error("[API] Upload failed:", err);
    throw err;
  }
}

/**
 * Clear the entire knowledge base.
 */
export async function clearKnowledgeBase() {
  console.log("[API] Clearing knowledge base...");
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/clear`, {
      method: "POST",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Clear failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error("[API] Clear failed:", err);
    throw err;
  }
}

/**
 * Get the list of documents currently in the knowledge base.
 */
export async function getDocuments() {
  console.log("[API] Fetching documents...");
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/documents`, {
      method: "GET",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Fetch docs failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error("[API] Fetch docs failed:", err);
    throw err;
  }
}
