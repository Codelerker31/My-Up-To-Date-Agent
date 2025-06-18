"use client"

import type React from "react"

import { useState } from "react"
import { Send, Paperclip, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
  onSendMessage: (content: string) => void
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim())
      setInputValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="p-4 border-t border-[hsl(var(--ua-border))] bg-[hsl(var(--ua-bg-secondary))]">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about any topic you'd like to research..."
            className="min-h-[44px] max-h-32 resize-none bg-[hsl(var(--ua-bg-tertiary))] border-[hsl(var(--ua-border))] text-[hsl(var(--ua-text-primary))] placeholder-[hsl(var(--ua-text-muted))] focus:border-[hsl(var(--ua-accent))] focus:ring-2 focus:ring-[hsl(var(--ua-accent))]/20 pr-20"
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[hsl(var(--ua-text-muted))] hover:text-[hsl(var(--ua-text-primary))]"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[hsl(var(--ua-text-muted))] hover:text-[hsl(var(--ua-text-primary))]"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={!inputValue.trim()}
          className="bg-[hsl(var(--ua-accent))] hover:bg-[hsl(var(--ua-accent-hover))] disabled:bg-[hsl(var(--ua-bg-tertiary))] disabled:text-[hsl(var(--ua-text-muted))] text-white self-end"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
      <div className="flex justify-between items-center mt-2 text-xs text-[hsl(var(--ua-text-muted))]">
        <span>⌘ + Enter to send</span>
        <span>{inputValue.length}/2000</span>
      </div>
    </div>
  )
}
