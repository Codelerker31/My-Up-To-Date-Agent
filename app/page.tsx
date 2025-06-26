"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { StreamSidebar } from "@/components/layout/stream-sidebar"
import { ChatInterface } from "@/components/chat/chat-interface-integrated"
import { CommandPalette } from "@/components/ui/command-palette"
import { AuthPage } from "@/components/auth/auth-page"
import { useAuth } from "@/components/auth/auth-provider"
import { useStreams } from "@/hooks/use-streams"
import { Loader2 } from "lucide-react"
import type { FocusType } from "@/types"

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { streams, isLoading: streamsLoading } = useStreams()
  const [activeStreamId, setActiveStreamId] = useState<string>("")
  const [currentFocus, setCurrentFocus] = useState<FocusType>("research")
  const [showInsights, setShowInsights] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [layoutMode, setLayoutMode] = useState<"chat" | "research" | "overview">("chat")
  const [newsAlertsCount, setNewsAlertsCount] = useState(0)

  // Set first stream as active when streams load, filtered by current focus
  useEffect(() => {
    const focusStreams = streams.filter(stream => stream.focusType === currentFocus)
    if (focusStreams.length > 0 && !activeStreamId) {
      setActiveStreamId(focusStreams[0].id)
    } else if (focusStreams.length === 0 && activeStreamId) {
      // Clear active stream if no streams in current focus
      setActiveStreamId("")
    }
  }, [streams, currentFocus, activeStreamId])

  // Handle focus change
  const handleFocusChange = (newFocus: FocusType) => {
    setCurrentFocus(newFocus)
    
    // Clear active stream when switching focus
    setActiveStreamId("")
    
    // Reset layout mode to chat when switching focus
    setLayoutMode("chat")
    
    // Hide insights/timeline panels
    setShowInsights(false)
    setShowTimeline(false)
  }

  const activeStream = streams.find((stream) => stream.id === activeStreamId)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "k":
            e.preventDefault()
            setCommandPaletteOpen(true)
            break
          case "i":
            e.preventDefault()
            setShowInsights(!showInsights)
            break
          case "t":
            e.preventDefault()
            setShowTimeline(!showTimeline)
            break
          case "1":
            e.preventDefault()
            setLayoutMode("chat")
            break
          case "2":
            e.preventDefault()
            setLayoutMode("research")
            break
          case "3":
            e.preventDefault()
            setLayoutMode("overview")
            break
          case "n":
            e.preventDefault()
            setCurrentFocus("news")
            break
          case "r":
            e.preventDefault()
            setCurrentFocus("research")
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showInsights, showTimeline])

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Updates Agent...</p>
        </div>
      </div>
    )
  }

  // Show authentication page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />
  }

  return (
    <MainLayout>
      <div className="flex h-screen bg-[hsl(var(--ua-bg-primary))]">
        <StreamSidebar
          streams={streams}
          activeStreamId={activeStreamId}
          onStreamSelect={setActiveStreamId}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          currentFocus={currentFocus}
          onFocusChange={handleFocusChange}
          newsAlertsCount={newsAlertsCount}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {layoutMode === "chat" && (
            <ChatInterface
              activeStream={activeStream}
              onToggleInsights={() => setShowInsights(!showInsights)}
              onToggleTimeline={() => setShowTimeline(!showTimeline)}
            />
          )}

          {layoutMode === "research" && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {currentFocus === "news" ? "News Timeline" : "Research Timeline"}
              </h2>
              <p className="text-[hsl(var(--ua-text-secondary))]">
                {currentFocus === "news" 
                  ? "View real-time news updates and breaking alerts..." 
                  : "View the continuous research and update history for your topics..."
                }
              </p>
            </div>
          )}

          {layoutMode === "overview" && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {currentFocus === "news" ? "News Overview" : "Research Overview"}
              </h2>
              <p className="text-[hsl(var(--ua-text-secondary))]">
                {currentFocus === "news" 
                  ? "Dashboard showing all your news streams and alert settings..." 
                  : "Dashboard showing all your automated research streams and schedules..."
                }
              </p>
            </div>
          )}
        </div>

        {showInsights && (
          <div className="w-80 bg-[hsl(var(--ua-bg-secondary))] border-l border-[hsl(var(--ua-border))] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {currentFocus === "news" ? "Live Updates" : "Research Insights"}
              </h3>
              <button
                onClick={() => setShowInsights(false)}
                className="text-[hsl(var(--ua-text-muted))] hover:text-[hsl(var(--ua-text-primary))]"
              >
                ×
              </button>
            </div>
            <p className="text-[hsl(var(--ua-text-secondary))]">
              {currentFocus === "news" 
                ? "Real-time news monitoring and breaking alerts..." 
                : "Continuous monitoring insights and research patterns..."
              }
            </p>
          </div>
        )}
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        streams={streams}
        onStreamSelect={setActiveStreamId}
      />
    </MainLayout>
  )
}
