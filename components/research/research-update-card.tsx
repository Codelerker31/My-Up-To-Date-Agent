"use client"

import { Search, FileText, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Message } from "@/types"

interface ResearchUpdateCardProps {
  message: Message
}

export function ResearchUpdateCard({ message }: ResearchUpdateCardProps) {
  const { metadata } = message

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case "source_discovery":
        return Search
      case "content_analysis":
        return FileText
      case "insight_synthesis":
        return TrendingUp
      default:
        return Search
    }
  }

  const PhaseIcon = getPhaseIcon(metadata?.researchPhase)

  return (
    <Card className="bg-[hsl(var(--ua-bg-secondary))] border-[hsl(var(--ua-border))] p-4 fade-in-up">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-[hsl(var(--ua-accent))]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <PhaseIcon className="w-4 h-4 text-[hsl(var(--ua-accent))]" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              Research Update
            </Badge>
            <span className="text-xs text-[hsl(var(--ua-text-muted))]">{message.timestamp.toLocaleTimeString()}</span>
          </div>

          <p className="text-sm text-[hsl(var(--ua-text-primary))] mb-3">{message.content}</p>

          {metadata?.sourcesFound && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[hsl(var(--ua-text-muted))]">Sources Found</span>
                <span className="text-[hsl(var(--ua-text-secondary))]">{metadata.sourcesFound}</span>
              </div>
              <Progress value={(metadata.sourcesFound / 20) * 100} className="h-1" />
            </div>
          )}

          {metadata?.confidence && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {Math.round(metadata.confidence * 100)}% confidence
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
