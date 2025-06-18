"use client"

import { Info, TimerIcon as Timeline, Settings, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { UpdateStream } from "@/types"

interface ChatHeaderProps {
  stream?: UpdateStream
  onToggleInsights: () => void
  onToggleTimeline: () => void
  onScheduleClick: () => void
}

export function ChatHeader({ stream, onToggleInsights, onToggleTimeline, onScheduleClick }: ChatHeaderProps) {
  if (!stream) return null

  const getNextUpdateText = () => {
    if (stream.nextUpdate) {
      const now = new Date()
      const next = new Date(stream.nextUpdate)
      const diffHours = Math.round((next.getTime() - now.getTime()) / (1000 * 60 * 60))

      if (diffHours < 24) {
        return `Next update in ${diffHours}h`
      } else {
        const diffDays = Math.round(diffHours / 24)
        return `Next update in ${diffDays}d`
      }
    }
    return "Schedule not set"
  }

  return (
    <div className="p-4 border-b border-[hsl(var(--ua-border))] bg-[hsl(var(--ua-bg-secondary))]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full bg-${stream.color}-500`} />
          <div>
            <h2 className="text-xl font-semibold text-[hsl(var(--ua-text-primary))]">{stream.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {stream.frequency} updates
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stream.sources} sources monitored
              </Badge>
              <Badge
                variant={stream.isActive ? "default" : "secondary"}
                className={`text-xs ${stream.isActive ? "bg-green-500/20 text-green-600 border-green-500/30" : ""}`}
              >
                {stream.isActive ? "Active monitoring" : "Paused"}
              </Badge>
              <span className="text-xs text-[hsl(var(--ua-text-muted))]">{getNextUpdateText()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onScheduleClick}
            className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))]"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleInsights}
            className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))]"
          >
            <Info className="w-4 h-4 mr-2" />
            Insights
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTimeline}
            className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))]"
          >
            <Timeline className="w-4 h-4 mr-2" />
            Timeline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))]"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
