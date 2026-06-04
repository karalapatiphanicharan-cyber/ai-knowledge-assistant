import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import { queryDocuments, uploadDocument, clearKnowledgeBase, getDocuments } from './api'

let msgIdCounter = 1

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'ai',
      content: {
        intro: { prefix: '👋', highlight: 'Welcome to KnowAI!', suffix: ' I can help you analyze your documents.' },
        items: [
          { label: 'Upload', value: 'Add PDF, TXT or DOCX files to get started.' },
          { label: 'Ask', value: 'I answer strictly based on your uploaded documents.' }
        ],
        sources: []
      }
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [documents, setDocuments] = useState([])

  // Fetch documents on mount
  useEffect(() => {
    refreshDocuments()
  }, [])

  const refreshDocuments = async () => {
    try {
      const data = await getDocuments()
      setDocuments(data.documents || [])
    } catch (err) {
      console.error("Failed to refresh documents:", err)
    }
  }

  const handleSend = async (question) => {
    const userMsg = { id: msgIdCounter++, role: 'user', content: question }
    setMessages((prev) => [...prev, userMsg])

    setIsTyping(true)
    try {
      const data = await queryDocuments(question)

      const aiMsg = {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: { prefix: "", highlight: "", suffix: data.answer },
          items: [],
          sources: data.sources
        }
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      const errorMsg = {
        id: msgIdCounter++,
        role: 'ai',
        content: "Sorry, I encountered an error. Please check the backend connection."
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleFileUpload = async (file) => {
    const uploadingMsg = {
      id: msgIdCounter++,
      role: 'user',
      content: `📎 Uploading "${file.name}"…`,
    }
    setMessages((prev) => [...prev, uploadingMsg])
    setIsTyping(true)

    try {
      const data = await uploadDocument(file)
      await refreshDocuments()

      const successMsg = {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: {
            prefix: '✅',
            highlight: file.name,
            suffix: ` uploaded successfully!`,
          },
          items: [
            { label: 'Chunks stored', value: `${data.chunks_stored} chunks indexed into the knowledge base.` },
          ],
          sources: [],
        },
      }
      setMessages((prev) => [...prev, successMsg])
    } catch (err) {
      const errorMsg = {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: {
            prefix: '⚠️ Upload failed:',
            highlight: null,
            suffix: ` ${err.message}`,
          },
          items: [],
          sources: [],
        },
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleClearKB = async () => {
    setIsTyping(true)
    try {
      await clearKnowledgeBase()
      setDocuments([])
      setMessages([
        {
          id: msgIdCounter++,
          role: 'ai',
          content: {
            intro: { prefix: '🧹', highlight: 'Knowledge Base Cleared!', suffix: ' All documents and chat history have been reset.' },
            items: [],
            sources: []
          }
        }
      ])
    } catch (err) {
      alert("Failed to clear knowledge base: " + err.message)
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0f12]">
      <Sidebar documents={documents} onFileUpload={handleFileUpload} onClearKB={handleClearKB} />
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        <ChatWindow messages={messages} isTyping={isTyping} />
        <InputBar onSend={handleSend} onFileUpload={handleFileUpload} disabled={isTyping} />
      </main>
    </div>
  )
}
