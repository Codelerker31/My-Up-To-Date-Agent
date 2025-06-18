"use client"

import { Bot } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-[hsl(var(--ua-accent))] flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>

      <div className="bg-[hsl(var(--ua-bg-secondary))] border border-[hsl(var(--ua-border))] rounded-lg px-4 py-2">
        <div className="flex gap-1 items-center">
          <div className="w-2 h-2 bg-[hsl(var(--ua-text-secondary))] rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-[hsl(var(--ua-text-secondary))] rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 bg-[hsl(var(--ua-text-secondary))] rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
      </div>
    </div>
  )
}
