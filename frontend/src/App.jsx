import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import { queryDocuments, uploadDocument } from './api'

let msgIdCounter = 1

export default function App() {
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)

  // -----------------------------------------------------------------------
  // Chat: send question to /api/query, display results
  // -----------------------------------------------------------------------
  const handleSend = async (text) => {
    const userMsg = { id: msgIdCounter++, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const data = await queryDocuments(text)

      // Build structured content that MessageBubble already renders
      const aiContent = {
        intro: {
          prefix: data.answer,
          highlight: null,
          suffix: '',
        },
        items: data.items || [],
        sources: data.sources || [],
      }

      const aiMsg = { id: msgIdCounter++, role: 'ai', content: aiContent }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      // Show error as an AI message so it appears inline in the chat
      const errorMsg = {
        id: msgIdCounter++,
        role: 'ai',
        content: {
          intro: {
            prefix: '⚠️ Error:',
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

  // -----------------------------------------------------------------------
  // File upload: send file to /api/upload, show result in chat
  // -----------------------------------------------------------------------
  const handleFileUpload = async (file) => {
    // Show an "uploading…" user-side message
    const uploadingMsg = {
      id: msgIdCounter++,
      role: 'user',
      content: `📎 Uploading "${file.name}"…`,
    }
    setMessages((prev) => [...prev, uploadingMsg])
    setIsTyping(true)

    try {
      const data = await uploadDocument(file)

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0f12]">
      <Sidebar onFileUpload={handleFileUpload} />
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        <ChatWindow messages={messages} isTyping={isTyping} />
        <InputBar onSend={handleSend} onFileUpload={handleFileUpload} disabled={isTyping} />
      </main>
    </div>
  )
}
