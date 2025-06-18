"use client"

import { Calendar, ExternalLink, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Newsletter } from "@/types"

interface NewsletterCardProps {
  newsletter: Newsletter
  onViewNewsletter: (newsletter: Newsletter) => void
}

export function NewsletterCard({ newsletter, onViewNewsletter }: NewsletterCardProps) {
  return (
    <Card className="bg-[hsl(var(--ua-bg-secondary))] border-[hsl(var(--ua-border))] p-6 max-w-2xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-[hsl(var(--ua-accent))] rounded-full flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[hsl(var(--ua-text-primary))] mb-2">Your Newsletter is Ready</h3>

          <div className="text-sm text-[hsl(var(--ua-text-secondary))] mb-3">
            <p className="font-medium">{newsletter.title}</p>
            <p className="text-[hsl(var(--ua-text-muted))]">
              Generated {newsletter.generatedAt.toLocaleDateString()} at{" "}
              {newsletter.generatedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <p className="text-sm text-[hsl(var(--ua-text-secondary))] leading-relaxed mb-4">{newsletter.summary}</p>

          <div className="flex gap-2">
            <Button
              onClick={() => onViewNewsletter(newsletter)}
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
              Start New Search From This
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
