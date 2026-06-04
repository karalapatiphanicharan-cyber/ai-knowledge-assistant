import React, { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import {
  queryDocuments,
  uploadDocument,
  clearKnowledgeBase,
  getDocuments,
  deleteDocument,
  previewDocument,
  summarizeDocument,
} from './api'

let msgIdCounter = 1

const createWelcomeMessage = () => ({
  id: msgIdCounter++,
  role: 'ai',
  content: {
    intro: {
      prefix: '',
      highlight: 'Welcome to KnowAI!',
      suffix: ' Upload documents and ask questions grounded in your files.',
    },
    items: [
      { label: 'Upload', value: 'Add PDF, TXT, or DOCX files to get started.' },
      { label: 'Ask', value: 'Answers are limited to uploaded document content.' },
    ],
    sources: [],
  },
})

export default function App() {
  const [messages, setMessages] = useState([createWelcomeMessage()])
  const [isTyping, setIsTyping] = useState(false)
  const [documents, setDocuments] = useState([])
  const [uploadProgress, setUploadProgress] = useState(null)
  const [panel, setPanel] = useState(null)

  useEffect(() => {
    refreshDocuments()
  }, [])

  const refreshDocuments = async () => {
    try {
      const data = await getDocuments()
      const docs = (data.documents || []).map((doc) => (
        typeof doc === 'string' ? { filename: doc, chunks: 0, characters: 0 } : doc
      ))
      setDocuments(docs)
    } catch (err) {
      console.error('Failed to refresh documents:', err)
    }
  }

  const handleSend = async (question) => {
    setMessages((prev) => [...prev, { id: msgIdCounter++, role: 'user', content: question }])
    setIsTyping(true)

    try {
      const data = await queryDocuments(question)
      setMessages((prev) => [...prev, {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: { prefix: '', highlight: '', suffix: data.answer },
          items: [],
          sources: data.sources || [],
        },
      }])
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: msgIdCounter++,
        role: 'ai',
        content: `Sorry, I encountered an error. ${err.message}`,
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleFileUpload = async (files) => {
    const fileList = Array.from(files instanceof FileList ? files : Array.isArray(files) ? files : [files]).filter(Boolean)
    if (fileList.length === 0) return

    setMessages((prev) => [...prev, {
      id: msgIdCounter++,
      role: 'user',
      content: `Uploading ${fileList.length === 1 ? `"${fileList[0].name}"` : `${fileList.length} documents`}...`,
    }])
    setIsTyping(true)

    try {
      const results = []
      for (let index = 0; index < fileList.length; index += 1) {
        const file = fileList[index]
        setUploadProgress({ current: index + 1, total: fileList.length, filename: file.name })
        const data = await uploadDocument(file)
        results.push({ file, data })
        await refreshDocuments()
      }

      setMessages((prev) => [...prev, {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: {
            prefix: '',
            highlight: fileList.length === 1 ? fileList[0].name : `${fileList.length} documents`,
            suffix: ' uploaded successfully.',
          },
          items: results.map(({ file, data }) => ({
            label: file.name,
            value: `${data.chunks_stored} chunks indexed into the knowledge base.`,
          })),
          sources: [],
        },
      }])
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: { prefix: 'Upload failed:', highlight: null, suffix: ` ${err.message}` },
          items: [],
          sources: [],
        },
      }])
    } finally {
      setIsTyping(false)
      setUploadProgress(null)
    }
  }

  const handleClearKB = async () => {
    setIsTyping(true)
    try {
      await clearKnowledgeBase()
      setDocuments([])
      setPanel(null)
      setMessages([{
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: {
            prefix: '',
            highlight: 'Knowledge base cleared.',
            suffix: ' Documents, embeddings, metadata, and chat history have been reset.',
          },
          items: [],
          sources: [],
        },
      }])
    } catch (err) {
      alert(`Failed to clear knowledge base: ${err.message}`)
    } finally {
      setIsTyping(false)
    }
  }

  const handleResetSession = () => {
    setMessages([createWelcomeMessage()])
    setPanel(null)
  }

  const handleDeleteDocument = async (filename) => {
    setIsTyping(true)
    try {
      await deleteDocument(filename)
      await refreshDocuments()
      if (panel?.filename === filename) setPanel(null)
      setMessages((prev) => [...prev, {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: { prefix: '', highlight: filename, suffix: ' was removed from the knowledge base.' },
          items: [],
          sources: [],
        },
      }])
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`)
    } finally {
      setIsTyping(false)
    }
  }

  const handlePreviewDocument = async (filename) => {
    setPanel({ type: 'loading', filename, title: 'Loading preview...' })
    try {
      setPanel({ type: 'preview', ...(await previewDocument(filename)) })
    } catch (err) {
      setPanel({ type: 'error', filename, title: 'Preview failed', message: err.message })
    }
  }

  const handleSummarizeDocument = async (filename) => {
    setPanel({ type: 'loading', filename, title: 'Generating summary...' })
    try {
      setPanel({ type: 'summary', ...(await summarizeDocument(filename)) })
    } catch (err) {
      setPanel({ type: 'error', filename, title: 'Summary failed', message: err.message })
    }
  }

  const handleExportConversation = () => {
    const lines = messages.map((message) => {
      const label = message.role === 'user' ? 'User' : 'KnowAI'
      const content = typeof message.content === 'string'
        ? message.content
        : [
            message.content?.intro && `${message.content.intro.highlight || ''}${message.content.intro.suffix || ''}`.trim(),
            ...(message.content?.items || []).map((item) => `${item.label}: ${item.value}`),
            ...(message.content?.sources || []).map((source) => `Source: ${source.filename || source.file || source}`),
          ].filter(Boolean).join('\n')
      return `${label}:\n${content}`
    })
    const blob = new Blob([lines.join('\n\n---\n\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `knowai-conversation-${new Date().toISOString().slice(0, 10)}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0f12]">
      <Sidebar
        documents={documents}
        uploadProgress={uploadProgress}
        onFileUpload={handleFileUpload}
        onClearKB={handleClearKB}
        onResetSession={handleResetSession}
        onDeleteDocument={handleDeleteDocument}
        onPreviewDocument={handlePreviewDocument}
        onSummarizeDocument={handleSummarizeDocument}
        onExportConversation={handleExportConversation}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        {panel && <DocumentPanel panel={panel} onClose={() => setPanel(null)} />}
        <ChatWindow messages={messages} isTyping={isTyping} />
        <InputBar onSend={handleSend} onFileUpload={handleFileUpload} disabled={isTyping} />
      </main>
    </div>
  )
}

function DocumentPanel({ panel, onClose }) {
  return (
    <section className="mx-4 mt-4 rounded-xl border border-white/10 bg-[#151820] p-4 max-h-[34vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">{panel.type}</p>
          <h2 className="text-sm font-semibold text-white">{panel.filename || panel.title}</h2>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">x</button>
      </div>

      {panel.type === 'loading' && <p className="text-sm text-slate-400">{panel.title}</p>}
      {panel.type === 'error' && <p className="text-sm text-red-300">{panel.message}</p>}
      {panel.type === 'preview' && (
        <pre className="whitespace-pre-wrap text-[12.5px] leading-6 text-slate-300 font-sans">{panel.content}</pre>
      )}
      {panel.type === 'summary' && (
        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Overview</h3>
            <p>{panel.overview}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Main Points</h3>
            <ul className="space-y-1">{panel.main_points.map((point, i) => <li key={i}>- {point}</li>)}</ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Key Topics</h3>
            <p>{panel.key_topics.join(', ')}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Suggested Questions</h3>
            <ul className="space-y-1">{panel.suggested_questions.map((question, i) => <li key={i}>- {question}</li>)}</ul>
          </div>
        </div>
      )}
    </section>
  )
}
