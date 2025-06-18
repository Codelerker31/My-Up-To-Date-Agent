"use client"

import { X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Newsletter } from "@/types"
import { useState } from "react"
import type { JSX } from "react/jsx-runtime"

interface ContentViewerProps {
  isOpen: boolean
  newsletter: Newsletter | null
  onClose: () => void
  onAskAboutSection: (section: string) => void
}

export function ContentViewer({ isOpen, newsletter, onClose, onAskAboutSection }: ContentViewerProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)

  if (!isOpen || !newsletter) return null

  const handleSectionClick = (section: string) => {
    onAskAboutSection(section)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-1/2 bg-[hsl(var(--ua-bg-secondary))] border-l border-[hsl(var(--ua-border))] z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-[hsl(var(--ua-border))] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--ua-text-primary))] font-['Lora',serif]">
            {newsletter.title}
          </h2>
          <p className="text-sm text-[hsl(var(--ua-text-secondary))] mt-1">
            {newsletter.generatedAt.toLocaleDateString()}
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-neutral dark:prose-invert max-w-none font-['Lora',serif]">
          {newsletter.content.split("\n\n").map((paragraph, index) => {
            if (paragraph.startsWith("#")) {
              const level = paragraph.match(/^#+/)?.[0].length || 1
              const text = paragraph.replace(/^#+\s*/, "")
              const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements

              return (
                <HeadingTag
                  key={index}
                  className="text-[hsl(var(--ua-text-primary))] font-semibold mb-4 mt-6 first:mt-0"
                >
                  {text}
                </HeadingTag>
              )
            }

            if (paragraph.trim()) {
              return (
                <div
                  key={index}
                  className="relative group mb-4 p-2 -m-2 rounded hover:bg-[hsl(var(--ua-bg-tertiary))]/30 transition-colors cursor-pointer"
                  onMouseEnter={() => setHoveredSection(paragraph)}
                  onMouseLeave={() => setHoveredSection(null)}
                  onClick={() => handleSectionClick(paragraph.substring(0, 100) + "...")}
                >
                  <p className="text-[hsl(var(--ua-text-secondary))] leading-relaxed">{paragraph}</p>
                  {hoveredSection === paragraph && (
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-[hsl(var(--ua-accent))] hover:bg-[hsl(var(--ua-accent-hover))] text-white"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            }

            return null
          })}
        </div>
      </div>
    </div>
  )
}
