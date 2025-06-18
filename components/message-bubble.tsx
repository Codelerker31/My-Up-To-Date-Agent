"use client"

import type { Message } from "@/types"
import { Bot, User } from "lucide-react"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${
          isUser
            ? "bg-[hsl(var(--ua-bg-tertiary))] border border-[hsl(var(--ua-border))]"
            : "bg-[hsl(var(--ua-accent))]"
        }
      `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[hsl(var(--ua-text-primary))]" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message */}
      <div
        className={`
        max-w-[70%] rounded-lg px-4 py-2 border
        ${
          isUser
            ? "bg-[hsl(var(--ua-bg-tertiary))] text-[hsl(var(--ua-text-primary))] border-[hsl(var(--ua-border))]"
            : "bg-[hsl(var(--ua-bg-secondary))] text-[hsl(var(--ua-text-secondary))] border-[hsl(var(--ua-border))]"
        }
      `}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className="text-xs text-[hsl(var(--ua-text-muted))] mt-2">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  )
}
