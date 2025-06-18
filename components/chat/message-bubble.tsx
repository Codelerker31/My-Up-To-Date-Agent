"use client"

import { Bot, User, CheckCircle, Calendar, Clock, Repeat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Message } from "@/types"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "user"
  const isScheduleMessage = message.type === "schedule_request" || message.type === "schedule_confirmation"

  const renderScheduleOptions = () => {
    if (message.type === "schedule_request" && message.metadata?.scheduleOptions) {
      return (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.metadata.scheduleOptions.map((option: string) => (
            <Button key={option} variant="outline" size="sm" className="text-xs capitalize">
              {option}
            </Button>
          ))}
        </div>
      )
    }
    return null
  }

  const renderScheduleInfo = () => {
    if (message.type === "schedule_confirmation" && message.metadata?.schedule) {
      const { schedule } = message.metadata
      return (
        <div className="mt-3 p-3 bg-[hsl(var(--ua-bg-tertiary))] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[hsl(var(--ua-accent))]" />
            <span className="font-medium text-sm">Schedule Confirmed</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              <Repeat className="w-3 h-3 mr-1" />
              {schedule.frequency}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {schedule.time}
            </Badge>
            {schedule.nextUpdate && (
              <Badge variant="secondary" className="text-xs">
                Next: {new Date(schedule.nextUpdate).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} fade-in-up`}>
      {/* Avatar */}
      <div
        className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${
          isUser
            ? "bg-[hsl(var(--ua-bg-tertiary))] border border-[hsl(var(--ua-border))]"
            : isScheduleMessage
              ? "bg-[hsl(var(--ua-accent))]/20 border border-[hsl(var(--ua-accent))]/30"
              : "bg-[hsl(var(--ua-accent))]"
        }
      `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[hsl(var(--ua-text-primary))]" />
        ) : isScheduleMessage ? (
          <Calendar className="w-4 h-4 text-[hsl(var(--ua-accent))]" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message */}
      <div
        className={`
        max-w-[70%] rounded-lg px-4 py-3 border
        ${
          isUser
            ? "bg-[hsl(var(--ua-bg-tertiary))] text-[hsl(var(--ua-text-primary))] border-[hsl(var(--ua-border))]"
            : isScheduleMessage
              ? "bg-[hsl(var(--ua-accent))]/5 text-[hsl(var(--ua-text-primary))] border-[hsl(var(--ua-accent))]/20"
              : "bg-[hsl(var(--ua-bg-secondary))] text-[hsl(var(--ua-text-secondary))] border-[hsl(var(--ua-border))]"
        }
      `}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>

        {renderScheduleOptions()}
        {renderScheduleInfo()}

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-[hsl(var(--ua-text-muted))]">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {message.metadata?.confidence && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <Badge variant="secondary" className="text-xs">
                {Math.round(message.metadata.confidence * 100)}% confident
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
