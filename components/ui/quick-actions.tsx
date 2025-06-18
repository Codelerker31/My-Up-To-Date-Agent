"use client"

import { Archive, Settings, HelpCircle, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  return (
    <div className="p-4 border-t border-[hsl(var(--ua-border))] space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
        >
          <Archive className="w-4 h-4 mr-2" />
          Archive
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Help
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          Shortcuts
        </Button>
      </div>
    </div>
  )
}
