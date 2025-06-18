"use client"

import { useState } from "react"
import { MoreHorizontal, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { UpdateStream } from "@/types"

interface StreamCardProps {
  stream: UpdateStream
  isActive: boolean
  onClick: () => void
}

export function StreamCard({ stream, isActive, onClick }: StreamCardProps) {
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
        <h3 className="font-medium text-[hsl(var(--ua-text-primary))] truncate mb-1">{stream.title}</h3>

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
        </div>

        {/* Research Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[hsl(var(--ua-text-muted))]">Research Progress</span>
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
