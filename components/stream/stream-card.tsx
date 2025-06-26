"use client"

import { useState } from "react"
import { MoreHorizontal, Clock, AlertCircle, Newspaper, BookOpen, TrendingUp, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { UpdateStream, FocusType } from "@/types"

interface StreamCardProps {
  stream: UpdateStream
  isActive: boolean
  onClick: () => void
  focusType?: FocusType
}

export function StreamCard({ stream, isActive, onClick, focusType }: StreamCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const priorityColors = {
    high: "text-red-500",
    medium: "text-yellow-500",
    low: "text-green-500",
  }

  const streamColors = {
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    blue: "bg-blue-500/10 border-blue-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
    orange: "bg-orange-500/10 border-orange-500/20",
  }

  // Focus-specific content
  const getFocusIcon = () => {
    if (focusType === "news" || stream.focusType === "news") {
      return <Newspaper className="w-3 h-3" />
    }
    return <BookOpen className="w-3 h-3" />
  }

  const getFocusIndicator = () => {
    if (focusType === "news" || stream.focusType === "news") {
      return (
        <div className="flex items-center gap-1 text-xs text-[hsl(var(--ua-text-muted))]">
          <TrendingUp className="w-3 h-3" />
          <span>Live</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-xs text-[hsl(var(--ua-text-muted))]">
        <Target className="w-3 h-3" />
        <span>Research</span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative p-3 rounded-lg cursor-pointer transition-all duration-200 border
        ${
          isActive
            ? `${streamColors[stream.color]} border-[hsl(var(--ua-accent))]/30`
            : "hover:bg-[hsl(var(--ua-bg-tertiary))]/50 border-transparent"
        }
      `}
    >
      {/* Priority Indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {stream.hasNewUpdate && <div className="w-2 h-2 bg-[hsl(var(--ua-accent))] rounded-full animate-pulse" />}
        <AlertCircle className={`w-3 h-3 ${priorityColors[stream.priority]}`} />
      </div>

      {/* Main Content */}
      <div className="pr-8">
        {/* Title with Focus Icon */}
        <div className="flex items-center gap-2 mb-1">
          {getFocusIcon()}
          <h3 className="font-medium text-[hsl(var(--ua-text-primary))] truncate flex-1">{stream.title}</h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-[hsl(var(--ua-text-muted))] mb-2">
          <Clock className="w-3 h-3" />
          <span>{stream.frequency}</span>
          <span>•</span>
          <span>{stream.lastUpdate.toLocaleDateString()}</span>
        </div>

        {/* Insights Preview */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {stream.sources} sources
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {stream.insights} insights
            </Badge>
          </div>
          {getFocusIndicator()}
        </div>

        {/* Research/News Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[hsl(var(--ua-text-muted))]">
              {focusType === "news" || stream.focusType === "news" ? "Coverage Progress" : "Research Progress"}
            </span>
            <span className="text-[hsl(var(--ua-text-secondary))]">85%</span>
          </div>
          <Progress value={85} className="h-1" />
        </div>
      </div>

      {/* Hover Actions */}
      {isHovered && (
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              // Handle more actions
            }}
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
