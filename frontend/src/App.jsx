import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import {
  queryDocuments, uploadDocument, clearKnowledgeBase,
  getDocuments, deleteDocument, getStats, getSystemStatus, getSummary, getPreview, searchSnippets
} from './api'

let msgIdCounter = 1

export default function App() {
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [documents, setDocuments] = useState([])
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [previewDoc, setPreviewDoc] = useState(null)
  const [searchResults, setSearchQuery] = useState(null)

  useEffect(() => {
    refreshData()
    const timer = setInterval(checkStatus, 15000)
    return () => clearInterval(timer)
  }, [])

  const refreshData = async () => {
    try {
      const [docsData, statsData] = await Promise.all([getDocuments(), getStats()])
      setDocuments(docsData.documents || [])
      setStats(statsData)
      checkStatus()
    } catch (err) { console.error("Data refresh failed", err) }
  }

  const checkStatus = async () => {
    try {
      const s = await getSystemStatus()
      setStatus(s)
    } catch { setStatus({ backend: 'Offline' }) }
  }

  const handleSend = async (question) => {
    if (!question.trim()) return
    setHistory(prev => [question, ...prev.filter(q => q !== question)].slice(0, 5))
    const userMsg = { id: msgIdCounter++, role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)

    try {
      const data = await queryDocuments(question)
      setMessages(prev => [...prev, { id: msgIdCounter++, role: 'ai', content: data }])
    } catch (err) {
      setMessages(prev => [...prev, { id: msgIdCounter++, role: 'ai', content: "Error: " + err.message }])
    } finally { setIsTyping(false) }
  }

  const handleFileUpload = async (file) => {
    setIsTyping(true)
    try {
      const data = await uploadDocument(file)
      await refreshData()
      const safe_name = data.filename
      const sum = await getSummary(safe_name)
      setMessages(prev => [...prev, {
        id: msgIdCounter++,
        role: 'ai',
        content: { summary_data: sum, confidence: 'High', answer: "Summary for " + safe_name }
      }])
    } catch (err) { alert("Upload failed: " + err.message) }
    finally { setIsTyping(false) }
  }

  const handleClear = async () => {
    if (!confirm("Clear knowledge base?")) return
    try {
        await clearKnowledgeBase()
        setMessages([])
        setHistory([])
        await refreshData()
    } catch (err) { alert("Clear failed: " + err.message) }
  }

  const handleExport = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${typeof m.content === 'object' ? (m.content.answer || 'Summary Data') : m.content}`).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'chat_export.txt'; a.click()
  }

  const handleDocDelete = async (name) => {
      if (!confirm(`Delete ${name}?`)) return
      try {
          await deleteDocument(name)
          await refreshData()
      } catch (err) { alert("Delete failed: " + err.message) }
  }

  const handleDocSummary = async (name) => {
      setIsTyping(true)
      try {
          const s = await getSummary(name)
          setMessages(prev => [...prev, { id: msgIdCounter++, role: 'ai', content: { summary_data: s, confidence: 'High' } }])
      } catch (err) { alert("Summary failed: " + err.message) }
      finally { setIsTyping(false) }
  }

  const handleDocPreview = async (name) => {
      try {
          const p = await getPreview(name)
          setPreviewDoc(p)
      } catch (err) { alert("Preview failed: " + err.message) }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0f12] text-slate-300 font-sans text-[14px]">
      <Sidebar
        documents={documents} stats={stats}
        onFileUpload={handleFileUpload} onClearKB={handleClear}
        onDeleteDoc={handleDocDelete}
        onSummary={handleDocSummary}
        onPreview={handleDocPreview}
        onExport={handleExport}
        history={history}
        onSelectQuestion={handleSend}
        onSearch={async (q) => { if (!q) { setSearchQuery(null); return; } try { const r = await searchSnippets(q); setSearchQuery(r.results); } catch { setSearchQuery([]); } }}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <Header status={status} />

        <div className="flex-1 overflow-hidden flex flex-col">
          {documents.length === 0 && !isTyping ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-700">
               <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-6 border border-blue-500/20 shadow-xl">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
               </div>
               <h2 className="text-xl font-bold text-white mb-2">Welcome to KnowAI Pro</h2>
               <p className="max-w-xs text-slate-500 text-sm mb-8">Upload documents to start a conversation. Supports PDF, TXT, and DOCX.</p>
               <button onClick={() => document.querySelector('input[type="file"]').click()} className="px-6 py-2.5 rounded-xl bg-white text-[#0d0f12] font-bold hover:bg-slate-100 transition-all active:scale-95 text-sm shadow-lg">Upload your first file</button>
            </div>
          ) : (
            <ChatWindow messages={messages} isTyping={isTyping} onRegenerate={() => handleSend(history[0])} />
          )}
        </div>

        <div className="p-4 max-w-4xl mx-auto w-full">
           <InputBar onSend={handleSend} onFileUpload={handleFileUpload} disabled={isTyping} />
        </div>

        {searchResults && (
          <div className="absolute top-20 right-6 w-80 max-h-[70%] bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
             <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Search Results</span>
                <button onClick={() => setSearchQuery(null)} className="text-slate-500 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {searchResults.length === 0 ? <p className="text-center text-[11px] text-slate-600 py-10">No matches found</p> : searchResults.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                     <div className="text-[10px] text-blue-400 font-bold mb-1 truncate">{r.source}</div>
                     <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 group-hover:text-slate-200">{r.snippet}</p>
                  </div>
                ))}
             </div>
          </div>
        )}

        {previewDoc && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setPreviewDoc(null)}>
             <div className="bg-[#16181f] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                   <div>
                      <h2 className="text-lg font-bold text-white mb-1 truncate max-w-md">{previewDoc.source}</h2>
                      <div className="flex gap-4 text-[10px] text-slate-500 font-mono">
                         <span>Chunks: {previewDoc.chunk_count}</span>
                         <span>Words: {previewDoc.word_count}</span>
                      </div>
                   </div>
                   <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{previewDoc.preview}</pre>
                </div>
                <div className="p-4 border-t border-white/5 text-center text-[10px] text-slate-600">Document preview limited to first 500 characters.</div>
             </div>
          </div>
        )}
      </main>
    </div>
  )
}
