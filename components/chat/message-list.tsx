"use client"

import { useEffect, useRef } from "react"
import { MessageBubble } from "@/components/chat/message-bubble"
import { ResearchUpdateCard } from "@/components/research/research-update-card"
import { NewsletterPreview } from "@/components/newsletter/newsletter-preview"
import type { Message, Newsletter } from "@/types"

interface MessageListProps {
  messages: Message[]
  onViewNewsletter?: (newsletter: Newsletter) => void
}

export function MessageList({ messages, onViewNewsletter }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        switch (message.type) {
          case "research_update":
            return <ResearchUpdateCard key={message.id} message={message} />
          case "newsletter":
            return <NewsletterPreview key={message.id} message={message} onViewNewsletter={onViewNewsletter} />
          default:
            return <MessageBubble key={message.id} message={message} />
        }
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}
