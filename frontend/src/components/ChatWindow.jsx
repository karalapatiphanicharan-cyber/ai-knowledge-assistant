import React, { useRef, useEffect } from 'react'
import { UserMessage, AIMessage, TypingIndicator } from './MessageBubble'

export default function ChatWindow({ messages, isTyping, onRegenerate }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-2">
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <UserMessage key={msg.id} content={msg.content} />
          ) : (
            <AIMessage key={msg.id} content={msg.content} onRegenerate={onRegenerate} />
          )
        )}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}
