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

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { streams, isLoading: streamsLoading } = useStreams()
  const [activeStreamId, setActiveStreamId] = useState<string>("")
  const [showInsights, setShowInsights] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [layoutMode, setLayoutMode] = useState<"chat" | "research" | "overview">("chat")

  // Set first stream as active when streams load
  useEffect(() => {
    if (streams.length > 0 && !activeStreamId) {
      setActiveStreamId(streams[0].id)
    }
  }, [streams, activeStreamId])

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
              <h2 className="text-2xl font-bold mb-4">Automated Research Timeline</h2>
              <p className="text-[hsl(var(--ua-text-secondary))]">
                View the continuous research and update history for your topics...
              </p>
            </div>
          )}

          {layoutMode === "overview" && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Research Overview</h2>
              <p className="text-[hsl(var(--ua-text-secondary))]">
                Dashboard showing all your automated research streams and schedules...
              </p>
            </div>
          )}
        </div>

        {showInsights && (
          <div className="w-80 bg-[hsl(var(--ua-bg-secondary))] border-l border-[hsl(var(--ua-border))] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Automated Insights</h3>
              <button
                onClick={() => setShowInsights(false)}
                className="text-[hsl(var(--ua-text-muted))] hover:text-[hsl(var(--ua-text-primary))]"
              >
                ×
              </button>
            </div>
            <p className="text-[hsl(var(--ua-text-secondary))]">
              Continuous monitoring insights and research patterns...
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
