"use client"

import type React from "react"
import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageBubble } from "@/components/message-bubble"
import { NewsletterCard } from "@/components/newsletter-card"
import { TypingIndicator } from "@/components/typing-indicator"
import type { UpdateStream, Message, Newsletter } from "@/types"

interface ChatPanelProps {
  activeStream?: UpdateStream
  messages: Message[]
  isAgentTyping: boolean
  onSendMessage: (content: string) => void
  onViewNewsletter: (newsletter: Newsletter) => void
}

export function ChatPanel({ activeStream, messages, isAgentTyping, onSendMessage, onViewNewsletter }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim())
      setInputValue("")
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[hsl(var(--ua-bg-primary))]">
      {/* Header */}
      {activeStream && (
        <div className="p-4 border-b border-[hsl(var(--ua-border))] bg-[hsl(var(--ua-bg-secondary))]">
          <h2 className="text-xl font-semibold text-[hsl(var(--ua-text-primary))]">{activeStream.title}</h2>
          <p className="text-sm text-[hsl(var(--ua-text-secondary))] mt-1">{activeStream.frequency} updates</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.type === "newsletter" && message.newsletter ? (
              <NewsletterCard newsletter={message.newsletter} onViewNewsletter={onViewNewsletter} />
            ) : (
              <MessageBubble message={message} />
            )}
          </div>
        ))}

        {isAgentTyping && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[hsl(var(--ua-border))] bg-[hsl(var(--ua-bg-secondary))]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me about any topic you'd like to stay updated on..."
            className="flex-1 bg-[hsl(var(--ua-bg-tertiary))] border-[hsl(var(--ua-border))] text-[hsl(var(--ua-text-primary))] placeholder-[hsl(var(--ua-text-muted))] focus:border-[hsl(var(--ua-accent))] focus:ring-[hsl(var(--ua-accent))]"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim()}
            className="bg-[hsl(var(--ua-accent))] hover:bg-[hsl(var(--ua-accent-hover))] disabled:bg-[hsl(var(--ua-bg-tertiary))] disabled:text-[hsl(var(--ua-text-muted))] text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
