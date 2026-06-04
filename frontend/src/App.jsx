import React, { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import {
  queryDocuments, uploadDocument, clearKnowledgeBase,
  getDocuments, deleteDocument, getStats, getSystemStatus, getSummary
} from './api'

let msgIdCounter = 1

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'ai',
      content: {
        intro: { prefix: '👋', highlight: 'Welcome to KnowAI Pro!', suffix: ' I can help you analyze multiple documents with high precision.' },
        items: [
          { label: 'Multi-Doc Support', value: 'Upload several files and I will search across all of them.' },
          { label: 'Smart Insights', value: 'Generate summaries and suggested questions automatically.' }
        ],
        sources: [],
        confidence: 'High'
      }
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [documents, setDocuments] = useState([])
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [sessionInfo, setSessionInfo] = useState({
    docs: 0,
    queries: 0,
    started: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
  const [uploadStage, setUploadStage] = useState('')

  useEffect(() => {
    refreshData()
    const timer = setInterval(checkStatus, 10000)
    return () => clearInterval(timer)
  }, [])

  const refreshData = async () => {
    try {
      const [docsData, statsData] = await Promise.all([getDocuments(), getStats()])
      setDocuments(docsData.documents || [])
      setStats(statsData)
      setSessionInfo(prev => ({ ...prev, docs: docsData.documents.length }))
      checkStatus()
    } catch (err) {
      console.error("Refresh failed:", err)
    }
  }

  const checkStatus = async () => {
    try {
      const statusData = await getSystemStatus()
      setStatus(statusData)
    } catch (err) {
      setStatus({ backend: 'Offline', embedding_model: 'Error', vector_db: 'Error' })
    }
  }

  const handleSend = async (question) => {
    setHistory(prev => [question, ...prev.slice(0, 4)])
    const userMsg = { id: msgIdCounter++, role: 'user', content: question }
    setMessages((prev) => [...prev, userMsg])
    setSessionInfo(prev => ({ ...prev, queries: prev.queries + 1 }))

    setIsTyping(true)
    try {
      const data = await queryDocuments(question)
      const aiMsg = {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: { prefix: "", highlight: "", suffix: data.answer },
          items: [],
          sources: data.sources,
          confidence: data.confidence
        }
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      setMessages((prev) => [...prev, { id: msgIdCounter++, role: 'ai', content: "Error communicating with the brain. Check system status." }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleFileUpload = async (file) => {
    if (documents.includes(file.name)) {
      alert("Document already exists.")
      return
    }

    setIsTyping(true)
    try {
      setUploadStage('Reading document...')
      // Simulate real-time pipeline stages since backend is fast on small files
      setTimeout(() => setUploadStage('Creating chunks...'), 500)
      setTimeout(() => setUploadStage('Generating embeddings...'), 1000)

      const data = await uploadDocument(file)
      setUploadStage('Indexing...')

      await refreshData()

      const summaryData = await getSummary(file.name)

      const successMsg = {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: { prefix: '✅', highlight: file.name, suffix: ' indexed successfully.' },
          items: [
             { label: 'Summary', value: summaryData.summary },
             { label: 'Key Topics', value: summaryData.topics.join(', ') }
          ],
          sources: [],
          confidence: 'High'
        }
      }
      setMessages((prev) => [...prev, successMsg])

      // Auto-suggest questions
      if (summaryData.suggestions?.length > 0) {
        setMessages(prev => [...prev, {
            id: msgIdCounter++,
            role: 'ai',
            content: "Suggested questions: " + summaryData.suggestions.join(' | ')
        }])
      }

    } catch (err) {
      alert(err.message)
    } finally {
      setIsTyping(false)
      setUploadStage('')
    }
  }

  const handleDeleteDoc = async (name) => {
    if (!confirm(`Remove "${name}"?`)) return
    try {
      await deleteDocument(name)
      await refreshData()
    } catch (err) {
      alert("Delete failed.")
    }
  }

  const handleClearKB = async () => {
    if (!confirm("Clear entire knowledge base?")) return
    try {
      await clearKnowledgeBase()
      setHistory([])
      await refreshData()
      setMessages([{
        id: msgIdCounter++,
        role: 'ai',
        content: { intro: { prefix: '🧹', highlight: 'Knowledge Base Reset', suffix: '' }, items: [], sources: [], confidence: 'High' }
      }])
    } catch (err) {
      alert("Clear failed.")
    }
  }

  const handleExport = () => {
    const content = messages.map(m => `[${m.role.toUpperCase()}] ${typeof m.content === 'string' ? m.content : m.content.intro?.suffix}`).join('\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'conversation.txt'
    a.click()
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0f12] text-slate-300 font-sans">
      <Sidebar
        documents={documents}
        stats={stats}
        onFileUpload={handleFileUpload}
        onClearKB={handleClearKB}
        onDeleteDoc={handleDeleteDoc}
        onSummary={async (name) => { setIsTyping(true); const d = await getSummary(name); setMessages(prev => [...prev, { id: msgIdCounter++, role: "ai", content: { intro: { prefix: "📊 Summary: ", highlight: name, suffix: d.summary }, items: [], sources: [], confidence: "High" } }]); setIsTyping(false); }}
        history={history}
        sessionInfo={sessionInfo}
        onSelectQuestion={handleSend}
      />
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0f12]">
        <Header status={status} />

        {documents.length === 0 && !isTyping ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-700">
             <div className="w-20 h-20 rounded-3xl bg-blue-600/10 flex items-center justify-center mb-8 border border-blue-500/20 shadow-2xl shadow-blue-500/5">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
             </div>
             <h2 className="text-2xl font-bold text-white mb-3">Your Knowledge Awaits</h2>
             <p className="max-w-md text-slate-500 leading-relaxed mb-8">Upload documents to begin asking questions. Supported formats include PDF, TXT, and DOCX.</p>
             <button onClick={() => document.querySelector('input[type="file"]').click()} className="px-8 py-3 rounded-xl bg-white text-[#0d0f12] font-bold hover:bg-slate-100 transition-all shadow-xl active:scale-95">Get Started</button>
          </div>
        ) : (
          <ChatWindow messages={messages} isTyping={isTyping} />
        )}

        {uploadStage && (
          <div className="px-6 py-2 bg-blue-600/10 border-t border-blue-500/20 flex items-center justify-center gap-3">
             <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></span>
             <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">{uploadStage}</span>
          </div>
        )}

        <div className="relative group">
          <InputBar onSend={handleSend} onFileUpload={handleFileUpload} disabled={isTyping} />
          <button onClick={handleExport} className="absolute right-24 bottom-10 p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all" title="Export Conversation">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
        </div>
      </main>
    </div>
  )
}
