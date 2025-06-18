"use client"

import type React from "react"

import { X, MessageCircle, Download, Share, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Newsletter } from "@/types"
import { useState } from "react"

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

  const renderContent = (content: string) => {
    const sections = content.split("\n\n")

    return sections.map((section, index) => {
      if (section.startsWith("#")) {
        const level = section.match(/^#+/)?.[0].length || 1
        const text = section.replace(/^#+\s*/, "")

        const HeadingComponent = ({ children }: { children: React.ReactNode }) => {
          const baseClasses = "text-[hsl(var(--ua-text-primary))] font-semibold mb-4 mt-6 first:mt-0"

          switch (level) {
            case 1:
              return <h1 className={`${baseClasses} text-2xl`}>{children}</h1>
            case 2:
              return <h2 className={`${baseClasses} text-xl`}>{children}</h2>
            case 3:
              return <h3 className={`${baseClasses} text-lg`}>{children}</h3>
            default:
              return <h4 className={`${baseClasses} text-base`}>{children}</h4>
          }
        }

        return <HeadingComponent key={index}>{text}</HeadingComponent>
      }

      if (section.trim().startsWith("-")) {
        const items = section.split("\n").filter((line) => line.trim().startsWith("-"))
        return (
          <ul key={index} className="list-disc list-inside space-y-1 mb-4 text-[hsl(var(--ua-text-secondary))]">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="leading-relaxed">
                {item.replace(/^-\s*/, "")}
              </li>
            ))}
          </ul>
        )
      }

      if (section.trim()) {
        return (
          <div
            key={index}
            className="relative group mb-4 p-3 -m-3 rounded-lg hover:bg-[hsl(var(--ua-bg-tertiary))]/30 transition-colors cursor-pointer"
            onMouseEnter={() => setHoveredSection(section)}
            onMouseLeave={() => setHoveredSection(null)}
            onClick={() => handleSectionClick(section.substring(0, 100) + "...")}
          >
            <p className="text-[hsl(var(--ua-text-secondary))] leading-relaxed">{section}</p>
            {hoveredSection === section && (
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
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[hsl(var(--ua-bg-secondary))] border border-[hsl(var(--ua-border))] rounded-lg w-full max-w-4xl h-[90vh] flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[hsl(var(--ua-border))] flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-[hsl(var(--ua-accent))]/20 text-[hsl(var(--ua-accent))]">Newsletter</Badge>
              {newsletter.confidence && (
                <Badge variant="secondary">{Math.round(newsletter.confidence * 100)}% confidence</Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold text-[hsl(var(--ua-text-primary))] font-['Lora',serif]">
              {newsletter.title}
            </h2>
            <p className="text-sm text-[hsl(var(--ua-text-secondary))] mt-1">
              Generated {newsletter.generatedAt.toLocaleDateString()} at{" "}
              {newsletter.generatedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))]"
            >
              <Bookmark className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))]"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))]"
            >
              <Share className="w-4 h-4" />
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))]"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="prose prose-neutral dark:prose-invert max-w-none font-['Lora',serif]">
            {renderContent(newsletter.content)}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-[hsl(var(--ua-border))] bg-[hsl(var(--ua-bg-tertiary))]/50">
          <div className="flex items-center justify-between text-xs text-[hsl(var(--ua-text-muted))]">
            <div className="flex items-center gap-4">
              {newsletter.sources && <span>{newsletter.sources.length} sources analyzed</span>}
              {newsletter.keyInsights && <span>{newsletter.keyInsights.length} key insights identified</span>}
            </div>
            <span>Click any paragraph to ask questions about it</span>
          </div>
        </div>
      </div>
    </div>
  )
}
