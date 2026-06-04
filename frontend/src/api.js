const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 15000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') throw new Error('Request timed out.');
    throw error;
  }
}

export async function queryDocuments(question) {
  const res = await fetchWithTimeout(`${BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    timeout: 90000
  });
  if (!res.ok) throw new Error(`Query failed (${res.status})`);
  return await res.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchWithTimeout(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
    timeout: 120000
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Upload failed");
  }
  return await res.json();
}

export async function clearKnowledgeBase() {
  const res = await fetchWithTimeout(`${BASE_URL}/clear`, { method: "POST" });
  if (!res.ok) throw new Error("Clear failed");
  return await res.json();
}

export async function getDocuments() {
  const res = await fetchWithTimeout(`${BASE_URL}/documents`, { method: "GET" });
  if (!res.ok) throw new Error("Fetch docs failed");
  return await res.json();
}

export async function deleteDocument(filename) {
  const res = await fetchWithTimeout(`${BASE_URL}/document/${encodeURIComponent(filename)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
  return await res.json();
}

export async function getStats() {
  const res = await fetchWithTimeout(`${BASE_URL}/stats`, { method: "GET" });
  if (!res.ok) throw new Error("Fetch stats failed");
  return await res.json();
}

export async function getPreview(filename) {
  const res = await fetchWithTimeout(`${BASE_URL}/document/${encodeURIComponent(filename)}/preview`, { method: "GET" });
  if (!res.ok) throw new Error("Fetch preview failed");
  return await res.json();
}

export async function getSummary(filename) {
  const res = await fetchWithTimeout(`${BASE_URL}/document/${encodeURIComponent(filename)}/summary`, { method: "GET", timeout: 60000 });
  if (!res.ok) throw new Error("Fetch summary failed");
  return await res.json();
}

export async function searchSnippets(query) {
  const res = await fetchWithTimeout(`${BASE_URL}/search-snippets?q=${encodeURIComponent(query)}`, { method: "GET" });
  if (!res.ok) throw new Error("Search failed");
  return await res.json();
}

export async function getSystemStatus() {
  const res = await fetchWithTimeout(`${BASE_URL}/status`, { method: "GET" });
  if (!res.ok) throw new Error("Fetch status failed");
  return await res.json();
}
