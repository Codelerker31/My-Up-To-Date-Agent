"use client"

import { ExternalLink, Search, Star, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Message, Newsletter } from "@/types"

interface NewsletterPreviewProps {
  message: Message
  onViewNewsletter?: (newsletter: Newsletter) => void
}

export function NewsletterPreview({ message, onViewNewsletter }: NewsletterPreviewProps) {
  const { newsletter } = message

  if (!newsletter) return null

  return (
    <Card className="bg-[hsl(var(--ua-bg-secondary))] border-[hsl(var(--ua-border))] p-6 max-w-2xl fade-in-up">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-[hsl(var(--ua-accent))] rounded-full flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-[hsl(var(--ua-accent))]/20 text-[hsl(var(--ua-accent))] border-[hsl(var(--ua-accent))]/30">
              Newsletter Ready
            </Badge>
            {newsletter.confidence && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                <span className="text-xs text-[hsl(var(--ua-text-muted))]">
                  {Math.round(newsletter.confidence * 100)}% confidence
                </span>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold text-[hsl(var(--ua-text-primary))] mb-2">{newsletter.title}</h3>

          <div className="text-sm text-[hsl(var(--ua-text-muted))] mb-3">
            <p>
              Generated {newsletter.generatedAt.toLocaleDateString()} at{" "}
              {newsletter.generatedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {newsletter.sources && <p className="mt-1">Based on {newsletter.sources.length} sources</p>}
          </div>

          <p className="text-sm text-[hsl(var(--ua-text-secondary))] leading-relaxed mb-4">{newsletter.summary}</p>

          {newsletter.keyInsights && newsletter.keyInsights.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-[hsl(var(--ua-text-muted))] mb-2">Key Insights</h4>
              <div className="flex flex-wrap gap-1">
                {newsletter.keyInsights.slice(0, 3).map((insight, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {insight}
                  </Badge>
                ))}
                {newsletter.keyInsights.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{newsletter.keyInsights.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => onViewNewsletter?.(newsletter)}
              className="bg-[hsl(var(--ua-accent))] hover:bg-[hsl(var(--ua-accent-hover))] text-white"
              size="sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Newsletter
            </Button>

            <Button
              variant="outline"
              className="border-[hsl(var(--ua-border))] text-[hsl(var(--ua-text-secondary))] hover:bg-[hsl(var(--ua-bg-tertiary))] hover:text-[hsl(var(--ua-text-primary))]"
              size="sm"
            >
              <Search className="w-4 h-4 mr-2" />
              Start New Search
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
