"use client"

import { Archive, Settings, HelpCircle, Keyboard, Bell, Download, Share, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FocusType } from "@/types"

interface QuickActionsProps {
  currentFocus: FocusType
}

export function QuickActions({ currentFocus }: QuickActionsProps) {
  const getActions = () => {
    if (currentFocus === "news") {
      return [
        { icon: Bell, label: "Alerts", action: () => console.log("Opening news alerts...") },
        { icon: TrendingUp, label: "Trending", action: () => console.log("Opening trending topics...") },
        { icon: Archive, label: "Archive", action: () => console.log("Opening archived news...") },
        { icon: Settings, label: "Settings", action: () => console.log("Opening news settings...") },
      ]
    } else {
      return [
        { icon: Download, label: "Export", action: () => console.log("Exporting research data...") },
        { icon: Share, label: "Share", action: () => console.log("Sharing research project...") },
        { icon: Archive, label: "Archive", action: () => console.log("Opening archived research...") },
        { icon: Settings, label: "Settings", action: () => console.log("Opening research settings...") },
      ]
    }
  }

  const actions = getActions()

  return (
    <div className="p-4 border-t border-[hsl(var(--ua-border))] space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {actions.slice(0, 2).map((action, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={action.action}
            className="justify-start text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
          >
            <action.icon className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.slice(2, 4).map((action, index) => (
          <Button
            key={index + 2}
            variant="ghost"
            size="sm"
            onClick={action.action}
            className="justify-start text-[hsl(var(--ua-text-secondary))] hover:text-[hsl(var(--ua-text-primary))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
          >
            <action.icon className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        ))}
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
