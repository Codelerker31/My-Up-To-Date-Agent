"use client"

import { useState } from "react"
import { Plus, Search, Zap, Clock, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { StreamCard } from "@/components/stream/stream-card"
import { QuickActions } from "@/components/ui/quick-actions"
import type { UpdateStream } from "@/types"

interface StreamSidebarProps {
  streams: UpdateStream[]
  activeStreamId: string
  onStreamSelect: (streamId: string) => void
  layoutMode: "chat" | "research" | "overview"
  onLayoutModeChange: (mode: "chat" | "research" | "overview") => void
}

export function StreamSidebar({
  streams,
  activeStreamId,
  onStreamSelect,
  layoutMode,
  onLayoutModeChange,
}: StreamSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState<"all" | "active" | "priority">("all")

  const filteredStreams = streams.filter((stream) => {
    if (searchQuery && !stream.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filterBy === "active" && !stream.hasNewUpdate) return false
    if (filterBy === "priority" && stream.priority !== "high") return false
    return true
  })

  const groupedStreams = filteredStreams.reduce(
    (acc, stream) => {
      const category = stream.category || "Other"
      if (!acc[category]) acc[category] = []
      acc[category].push(stream)
      return acc
    },
    {} as Record<string, UpdateStream[]>,
  )

  return (
    <div className="w-80 bg-[hsl(var(--ua-bg-secondary))] border-r border-[hsl(var(--ua-border))] flex flex-col">
      {/* Header with Smart Actions */}
      <div className="p-4 border-b border-[hsl(var(--ua-border))] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[hsl(var(--ua-text-primary))]">Research Streams</h1>
            <p className="text-xs text-[hsl(var(--ua-text-muted))]">
              {streams.filter((s) => s.hasNewUpdate).length} active updates
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Layout Mode Switcher */}
        <div className="flex gap-1 p-1 bg-[hsl(var(--ua-bg-tertiary))] rounded-lg">
          {[
            { mode: "chat" as const, icon: Zap, label: "Chat" },
            { mode: "research" as const, icon: Target, label: "Research" },
            { mode: "overview" as const, icon: Clock, label: "Overview" },
          ].map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant={layoutMode === mode ? "default" : "ghost"}
              size="sm"
              onClick={() => onLayoutModeChange(mode)}
              className="flex-1 h-8 text-xs"
            >
              <Icon className="w-3 h-3 mr-1" />
              {label}
            </Button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--ua-text-muted))]" />
            <Input
              placeholder="Search streams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-[hsl(var(--ua-bg-tertiary))] border-[hsl(var(--ua-border))] focus:border-[hsl(var(--ua-accent))] focus:ring-2 focus:ring-[hsl(var(--ua-accent))]/20"
            />
          </div>

          <div className="flex gap-1">
            {["all", "active", "priority"].map((filter) => (
              <Button
                key={filter}
                variant={filterBy === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterBy(filter as any)}
                className="h-7 text-xs capitalize"
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        <Button className="w-full bg-[hsl(var(--ua-accent))] hover:bg-[hsl(var(--ua-accent-hover))] text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Research Stream
        </Button>
      </div>

      {/* Stream Groups */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {Object.entries(groupedStreams).map(([category, categoryStreams]) => (
          <div key={category}>
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <h3 className="text-xs font-medium text-[hsl(var(--ua-text-muted))] uppercase tracking-wide">
                {category}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {categoryStreams.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {categoryStreams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  isActive={activeStreamId === stream.id}
                  onClick={() => onStreamSelect(stream.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Footer */}
      <QuickActions />
    </div>
  )
}
