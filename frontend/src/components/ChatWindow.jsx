import React, { useRef, useEffect } from 'react'
import { UserMessage, AIMessage, TypingIndicator } from './MessageBubble'

export default function ChatWindow({ messages, isTyping }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id} content={msg.content} />
        ) : (
          <AIMessage key={msg.id} content={msg.content} />
        )
      )}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
