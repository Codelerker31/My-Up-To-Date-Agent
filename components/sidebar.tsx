"use client"

import { Plus, Archive, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import type { UpdateStream } from "@/types"

interface SidebarProps {
  streams: UpdateStream[]
  activeStreamId: string
  onStreamSelect: (streamId: string) => void
}

export function Sidebar({ streams, activeStreamId, onStreamSelect }: SidebarProps) {
  return (
    <div className="w-80 bg-[hsl(var(--ua-bg-secondary))] border-r border-[hsl(var(--ua-border))] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--ua-border))]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-[hsl(var(--ua-text-primary))]">Update Streams</h1>
          <ThemeToggle />
        </div>
        <Button
          className="w-full bg-[hsl(var(--ua-accent))] hover:bg-[hsl(var(--ua-accent-hover))] text-white font-medium"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Stream
        </Button>
      </div>

      {/* Stream List */}
      <div className="flex-1 overflow-y-auto p-2">
        {streams.map((stream) => (
          <div
            key={stream.id}
            onClick={() => onStreamSelect(stream.id)}
            className={`
              p-3 rounded-lg cursor-pointer transition-colors mb-2
              ${
                activeStreamId === stream.id
                  ? "bg-[hsl(var(--ua-bg-tertiary))] border border-[hsl(var(--ua-border))]"
                  : "hover:bg-[hsl(var(--ua-bg-tertiary))]/50"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[hsl(var(--ua-text-primary))] truncate">{stream.title}</h3>
                <p className="text-sm text-[hsl(var(--ua-text-secondary))] mt-1">
                  {stream.frequency} • {stream.lastUpdate.toLocaleDateString()}
                </p>
              </div>
              {stream.hasNewUpdate && (
                <div className="w-2 h-2 bg-[hsl(var(--ua-accent))] rounded-full ml-2 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[hsl(var(--ua-border))] flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
        >
          <Archive className="w-4 h-4 mr-2" />
          Archive
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  )
}
