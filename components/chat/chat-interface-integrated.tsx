"use client"

import { useState } from "react"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatHeader } from "@/components/chat/chat-header"
import { ResearchStatus } from "@/components/research/research-status"
import { ContentViewer } from "@/components/content/content-viewer"
import { ScheduleDialog } from "@/components/schedule/schedule-dialog"
import { useChat } from "@/hooks/use-chat"
import { useWebSocket } from "@/lib/websocket"
import type { UpdateStream, Newsletter } from "@/types"

interface ChatInterfaceProps {
  activeStream?: UpdateStream
  onToggleInsights: () => void
  onToggleTimeline: () => void
}

export function ChatInterface({ activeStream, onToggleInsights, onToggleTimeline }: ChatInterfaceProps) {
  const { messages, sendMessage: sendChatMessage, isLoading } = useChat(activeStream?.id || null)
  const { triggerResearch, updateSchedule } = useWebSocket()
  const [isResearching, setIsResearching] = useState(false)
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null)
  const [isContentViewerOpen, setIsContentViewerOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)

  const handleSendMessage = async (content: string) => {
    // Check if user wants to modify schedule
    if (content.toLowerCase().includes("change schedule") || content.toLowerCase().includes("update frequency")) {
      setIsScheduleDialogOpen(true)
      return
    }

    // Check if user wants to trigger research
    if (content.toLowerCase().includes("research now") || content.toLowerCase().includes("update now")) {
      if (activeStream?.id) {
        triggerResearch(activeStream.id)
        setIsResearching(true)
        setTimeout(() => setIsResearching(false), 3000)
      }
      return
    }

    // Send message via WebSocket
    sendChatMessage(content)
  }

  const handleScheduleSelect = (frequency: string, time: string, dayOfWeek?: string) => {
    if (activeStream?.id) {
      const schedule = {
        frequency,
        dayOfWeek,
        time,
      }
      updateSchedule(activeStream.id, schedule)
    }
    setIsScheduleDialogOpen(false)
  }

  const handleViewNewsletter = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter)
    setIsContentViewerOpen(true)
  }

  const handleAskAboutSection = (section: string) => {
    setIsContentViewerOpen(false)
    setTimeout(() => {
      sendChatMessage(`Can you elaborate on: "${section}"?`)
    }, 300)
  }

  // Show loading state when no active stream
  if (!activeStream) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[hsl(var(--ua-bg-primary))]">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[hsl(var(--ua-text-primary))] mb-2">
            Select a Research Stream
          </h3>
          <p className="text-[hsl(var(--ua-text-secondary))]">
            Choose a stream from the sidebar to start chatting about your research topics.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[hsl(var(--ua-bg-primary))] relative">
      <ChatHeader
        stream={activeStream}
        onToggleInsights={onToggleInsights}
        onToggleTimeline={onToggleTimeline}
        onScheduleClick={() => setIsScheduleDialogOpen(true)}
      />

      {(isResearching || isLoading) && <ResearchStatus />}

      <MessageList messages={messages} onViewNewsletter={handleViewNewsletter} />

      <ChatInput onSendMessage={handleSendMessage} />

      <ContentViewer
        isOpen={isContentViewerOpen}
        newsletter={selectedNewsletter}
        onClose={() => setIsContentViewerOpen(false)}
        onAskAboutSection={handleAskAboutSection}
      />

      <ScheduleDialog
        isOpen={isScheduleDialogOpen}
        onClose={() => setIsScheduleDialogOpen(false)}
        onScheduleSelect={handleScheduleSelect}
        currentStream={activeStream}
      />
    </div>
  )
} 