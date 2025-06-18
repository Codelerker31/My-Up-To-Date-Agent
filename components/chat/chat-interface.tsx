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
import type { UpdateStream, Message, Newsletter } from "@/types"

interface ChatInterfaceProps {
  activeStream?: UpdateStream
  onToggleInsights: () => void
  onToggleTimeline: () => void
}

const mockMessages: Message[] = [
  {
    id: "1",
    type: "agent",
    content:
      "Hello! I'm your Updates Agent. I can help you stay continuously informed on any topic through automated research and scheduled newsletters. What would you like me to research and how often should I update you?",
    timestamp: new Date("2024-01-15T09:00:00"),
    metadata: {
      confidence: 1.0,
      sources: [],
    },
  },
  {
    id: "2",
    type: "user",
    content:
      "I want to stay updated on solid-state battery breakthroughs, particularly focusing on materials science advances.",
    timestamp: new Date("2024-01-15T09:01:00"),
  },
  {
    id: "3",
    type: "schedule_request",
    content: "Great topic! How often would you like me to research and deliver updates on solid-state batteries?",
    timestamp: new Date("2024-01-15T09:01:30"),
    metadata: {
      scheduleOptions: ["daily", "weekly", "bi-weekly", "monthly"],
    },
  },
  {
    id: "4",
    type: "user",
    content: "Weekly updates would be perfect.",
    timestamp: new Date("2024-01-15T09:02:00"),
  },
  {
    id: "5",
    type: "schedule_confirmation",
    content:
      "Perfect! I've set up automated weekly research for solid-state batteries. I'll deliver your first newsletter shortly, then continue researching and updating you every Monday at 9:00 AM. You can modify this schedule anytime by saying 'change schedule'.",
    timestamp: new Date("2024-01-15T09:02:30"),
    metadata: {
      schedule: {
        frequency: "weekly",
        dayOfWeek: "monday",
        time: "09:00",
        nextUpdate: new Date("2024-01-22T09:00:00"),
      },
    },
  },
  {
    id: "6",
    type: "research_update",
    content:
      "Starting your first automated research cycle. Analyzing the latest developments in solid-state batteries from the past week...",
    timestamp: new Date("2024-01-15T09:03:00"),
    metadata: {
      researchPhase: "source_discovery",
      sourcesFound: 12,
      confidence: 0.8,
      isAutomated: true,
    },
  },
  {
    id: "7",
    type: "newsletter",
    content:
      "Your first automated newsletter on Solid-State Batteries is ready! This is part of your weekly research schedule.",
    timestamp: new Date("2024-01-15T10:00:00"),
    newsletter: {
      id: "n1",
      title: "Solid-State Battery Breakthroughs: Week of January 15, 2024",
      summary:
        "Major advances in sulfide-based electrolytes, new polymer compositions showing 10x improved conductivity, and Toyota's latest solid-state prototype achieving 1000km range.",
      content: `# Solid-State Battery Breakthroughs: Week of January 15, 2024
*Automated Weekly Research Report #1*

## Executive Summary

This week brought significant developments in solid-state battery technology, with three major breakthroughs that could accelerate commercial adoption. This is your first automated weekly update - I'll continue monitoring and researching this topic every week.

## Key Developments This Week

### 1. MIT's Sulfide-Based Solid Electrolyte Breakthrough
*Published 3 days ago*

Researchers at MIT have developed a new class of sulfide-based solid electrolytes that achieve ionic conductivity comparable to liquid electrolytes while maintaining the safety benefits of solid-state technology.

Key findings:
- 25 mS/cm conductivity at room temperature
- Stable operation across -40°C to 100°C
- Compatible with lithium metal anodes
- Scalable manufacturing process demonstrated

### 2. Polymer Electrolyte Advances
*Published 5 days ago*

A collaborative effort between Panasonic, Toyota, and the University of Tokyo has yielded a new polymer electrolyte composition showing remarkable improvements.

Breakthrough metrics:
- 10x improvement in ionic conductivity
- Enhanced mechanical stability at high temperatures
- Reduced manufacturing complexity
- Cost reduction potential of 40%

### 3. Toyota's 1000km Range Prototype
*Announced 2 days ago*

Toyota's latest solid-state prototype achieved a remarkable 1000km range on a single charge, bringing commercial viability significantly closer.

Prototype specifications:
- Energy density: 500 Wh/kg
- Charging time: 10 minutes to 80%
- Cycle life: >10,000 cycles
- Target production: 2027

## Automated Research Methodology

This newsletter was compiled through continuous monitoring of:
- 12 peer-reviewed papers (3 new this week)
- 8 industry reports and press releases
- 15 patent filings (5 filed this week)
- 6 conference presentations and webinars

**Next Week's Monitoring Focus:**
- Manufacturing scale-up announcements
- New cathode material developments
- Automotive OEM partnerships
- Regulatory approval progress

## Schedule Information

- **Research Frequency:** Weekly (every Monday)
- **Next Update:** January 22, 2024 at 9:00 AM
- **Sources Monitored:** 41 active sources
- **Research Confidence:** 92%

*You can modify your update schedule anytime by asking me to "change schedule" or "update frequency".*

---

*This is an automated research report. I'll continue monitoring developments and deliver your next update on January 22nd.*`,
      generatedAt: new Date("2024-01-15T10:00:00"),
      confidence: 0.92,
      sources: [
        "Nature Energy - High-conductivity sulfide solid electrolytes",
        "Journal of Power Sources - Polymer electrolyte advances",
        "Toyota Technical Review - Solid-state battery development",
        "MIT Technology Review - Market analysis",
      ],
      keyInsights: [
        "25 mS/cm conductivity breakthrough",
        "10x polymer performance improvement",
        "1000km range prototype achieved",
        "Commercial timeline accelerated to 2027",
      ],
      isAutomated: true,
      scheduleInfo: {
        frequency: "weekly",
        nextUpdate: new Date("2024-01-22T09:00:00"),
        reportNumber: 1,
      },
    },
  },
]

export function ChatInterface({ activeStream, onToggleInsights, onToggleTimeline }: ChatInterfaceProps) {
  const { messages, sendMessage: sendChatMessage, isLoading } = useChat(activeStream?.id || null)
  const { triggerResearch, updateSchedule } = useWebSocket()
  const [isResearching, setIsResearching] = useState(false)
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null)
  const [isContentViewerOpen, setIsContentViewerOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>([])

  // Combine messages from chat hook with local messages
  const allMessages = [...messages, ...localMessages]

  const handleSendMessage = async (content: string) => {
    // Check if user wants to modify schedule
    if (content.toLowerCase().includes("change schedule") || content.toLowerCase().includes("update frequency")) {
      setIsScheduleDialogOpen(true)
      return
    }

    // Send message via WebSocket
    sendChatMessage(content)
  }

  const handleScheduleSelect = (frequency: string, time: string, dayOfWeek?: string) => {
    const scheduleMessage: Message = {
      id: `schedule-${Math.random().toString(36).substr(2, 9)}`,
      type: "schedule_confirmation",
      content: `Perfect! I've set up automated ${frequency} research updates. I'll continuously monitor your topics and deliver updates ${frequency === "daily" ? "every day" : frequency === "weekly" ? `every ${dayOfWeek}` : `every ${frequency}`} at ${time}. You can modify this schedule anytime.`,
      timestamp: new Date(),
      metadata: {
        schedule: {
          frequency,
          dayOfWeek,
          time,
          nextUpdate: (() => {
          const nextWeek = new Date()
          nextWeek.setDate(nextWeek.getDate() + 7)
          return nextWeek
        })()
        },
      },
    }
    setLocalMessages((prev) => [...prev, scheduleMessage])
    setIsScheduleDialogOpen(false)
  }

  const handleViewNewsletter = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter)
    setIsContentViewerOpen(true)
  }

  const handleAskAboutSection = (section: string) => {
    setIsContentViewerOpen(false)
    setTimeout(() => {
      const userMessage: Message = {
        id: `user-${Math.random().toString(36).substr(2, 9)}`,
        type: "user",
        content: `Can you elaborate on: "${section}"?`,
        timestamp: new Date(),
      }
      setLocalMessages((prev) => [...prev, userMessage])
    }, 300)
  }

  return (
    <div className="flex-1 flex flex-col bg-[hsl(var(--ua-bg-primary))] relative">
      <ChatHeader
        stream={activeStream}
        onToggleInsights={onToggleInsights}
        onToggleTimeline={onToggleTimeline}
        onScheduleClick={() => setIsScheduleDialogOpen(true)}
      />

      {isResearching && <ResearchStatus />}

      <MessageList messages={allMessages} onViewNewsletter={handleViewNewsletter} />

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
