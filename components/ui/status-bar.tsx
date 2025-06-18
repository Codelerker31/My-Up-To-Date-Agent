"use client"

import { useEffect, useState } from "react"
import { Wifi, Clock } from "lucide-react"

function LiveClock() {
  const [time, setTime] = useState<string>("")

  useEffect(() => {
    // Update time immediately
    setTime(new Date().toLocaleTimeString())
    
    // Update time every second
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-1">
      <Clock className="w-3 h-3" />
      <span>{time}</span>
    </div>
  )
}

export function StatusBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-6 bg-[hsl(var(--ua-bg-secondary))] border-t border-[hsl(var(--ua-border))] flex items-center justify-between px-4 text-xs text-[hsl(var(--ua-text-muted))] z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Wifi className="w-3 h-3" />
          <span>Connected</span>
        </div>
        <LiveClock />
      </div>
      <div className="flex items-center gap-4">
        <span>⌘K for commands</span>
        <span>⌘I for insights</span>
      </div>
    </div>
  )
}
