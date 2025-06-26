"use client"

import { useState } from "react"
import { Newspaper, BookOpen, Bell, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { FocusToggleProps, FocusType } from "@/types"

export function FocusToggle({
  currentFocus,
  onFocusChange,
  newsCount,
  researchCount,
  unreadAlertsCount = 0,
}: FocusToggleProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleFocusChange = async (newFocus: FocusType) => {
    if (newFocus === currentFocus) return

    setIsTransitioning(true)
    
    // Add a small delay for smooth transition
    setTimeout(() => {
      onFocusChange(newFocus)
      setIsTransitioning(false)
    }, 150)
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 bg-[hsl(var(--ua-bg-tertiary))] rounded-lg border border-[hsl(var(--ua-border))]">
        {/* News Focus Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentFocus === "news" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleFocusChange("news")}
              disabled={isTransitioning}
              className={`
                relative flex items-center gap-2 h-9 px-3 transition-all duration-200
                ${currentFocus === "news" 
                  ? "bg-[hsl(var(--ua-accent))] text-white shadow-sm" 
                  : "hover:bg-[hsl(var(--ua-bg-secondary))] text-[hsl(var(--ua-text-secondary))]"
                }
                ${isTransitioning ? "opacity-50" : ""}
              `}
            >
              <Newspaper className="w-4 h-4" />
              <span className="text-sm font-medium">News</span>
              
              {/* News count badge */}
              {newsCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className={`
                    ml-1 h-5 px-1.5 text-xs
                    ${currentFocus === "news" 
                      ? "bg-white/20 text-white" 
                      : "bg-[hsl(var(--ua-bg-primary))] text-[hsl(var(--ua-text-muted))]"
                    }
                  `}
                >
                  {newsCount}
                </Badge>
              )}

              {/* Unread alerts indicator */}
              {unreadAlertsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <Bell className="w-2 h-2 text-white" />
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">News Focus</p>
              <p className="text-xs text-[hsl(var(--ua-text-muted))]">
                Real-time news monitoring & breaking alerts
              </p>
              {unreadAlertsCount > 0 && (
                <p className="text-xs text-red-400 mt-1">
                  {unreadAlertsCount} unread alert{unreadAlertsCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-6 bg-[hsl(var(--ua-border))]" />

        {/* Research Focus Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentFocus === "research" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleFocusChange("research")}
              disabled={isTransitioning}
              className={`
                relative flex items-center gap-2 h-9 px-3 transition-all duration-200
                ${currentFocus === "research" 
                  ? "bg-[hsl(var(--ua-accent))] text-white shadow-sm" 
                  : "hover:bg-[hsl(var(--ua-bg-secondary))] text-[hsl(var(--ua-text-secondary))]"
                }
                ${isTransitioning ? "opacity-50" : ""}
              `}
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">Research</span>
              
              {/* Research count badge */}
              {researchCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className={`
                    ml-1 h-5 px-1.5 text-xs
                    ${currentFocus === "research" 
                      ? "bg-white/20 text-white" 
                      : "bg-[hsl(var(--ua-bg-primary))] text-[hsl(var(--ua-text-muted))]"
                    }
                  `}
                >
                  {researchCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">Research Focus</p>
              <p className="text-xs text-[hsl(var(--ua-text-muted))]">
                In-depth analysis & academic research
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Focus Indicator */}
        <div className="flex items-center gap-1 ml-2">
          {currentFocus === "news" && (
            <div className="flex items-center gap-1 text-[hsl(var(--ua-text-muted))]">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs">Live</span>
            </div>
          )}
          {currentFocus === "research" && (
            <div className="flex items-center gap-1 text-[hsl(var(--ua-text-muted))]">
              <BookOpen className="w-3 h-3" />
              <span className="text-xs">Deep</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Compact version for mobile or smaller spaces
export function FocusToggleCompact({
  currentFocus,
  onFocusChange,
  newsCount,
  researchCount,
  unreadAlertsCount = 0,
}: FocusToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[hsl(var(--ua-bg-tertiary))] rounded-md">
      <Button
        variant={currentFocus === "news" ? "default" : "ghost"}
        size="sm"
        onClick={() => onFocusChange("news")}
        className="relative h-8 w-8 p-0"
      >
        <Newspaper className="w-4 h-4" />
        {unreadAlertsCount > 0 && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </Button>
      
      <Button
        variant={currentFocus === "research" ? "default" : "ghost"}
        size="sm"
        onClick={() => onFocusChange("research")}
        className="h-8 w-8 p-0"
      >
        <BookOpen className="w-4 h-4" />
      </Button>
    </div>
  )
} 