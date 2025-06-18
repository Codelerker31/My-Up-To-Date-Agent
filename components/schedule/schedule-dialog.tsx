"use client"

import { useState } from "react"
import { Calendar, Clock, Repeat, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UpdateStream } from "@/types"

interface ScheduleDialogProps {
  isOpen: boolean
  onClose: () => void
  onScheduleSelect: (frequency: string, time: string, dayOfWeek?: string) => void
  currentStream?: UpdateStream
}

export function ScheduleDialog({ isOpen, onClose, onScheduleSelect, currentStream }: ScheduleDialogProps) {
  const [frequency, setFrequency] = useState("weekly")
  const [time, setTime] = useState("09:00")
  const [dayOfWeek, setDayOfWeek] = useState("monday")

  const frequencyOptions = [
    { value: "daily", label: "Daily", description: "Every day at the specified time" },
    { value: "weekly", label: "Weekly", description: "Once per week on the specified day" },
    { value: "bi-weekly", label: "Bi-weekly", description: "Every two weeks" },
    { value: "monthly", label: "Monthly", description: "Once per month" },
  ]

  const dayOptions = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ]

  const timeOptions = [
    { value: "06:00", label: "6:00 AM" },
    { value: "09:00", label: "9:00 AM" },
    { value: "12:00", label: "12:00 PM" },
    { value: "15:00", label: "3:00 PM" },
    { value: "18:00", label: "6:00 PM" },
    { value: "21:00", label: "9:00 PM" },
  ]

  const handleSave = () => {
    onScheduleSelect(frequency, time, dayOfWeek)
  }

  const getSchedulePreview = () => {
    const timeLabel = timeOptions.find((t) => t.value === time)?.label || time

    switch (frequency) {
      case "daily":
        return `Every day at ${timeLabel}`
      case "weekly":
        const dayLabel = dayOptions.find((d) => d.value === dayOfWeek)?.label || dayOfWeek
        return `Every ${dayLabel} at ${timeLabel}`
      case "bi-weekly":
        return `Every two weeks at ${timeLabel}`
      case "monthly":
        return `Monthly at ${timeLabel}`
      default:
        return ""
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Update Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {currentStream && (
            <div className="p-3 bg-[hsl(var(--ua-bg-tertiary))] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full bg-${currentStream.color}-500`} />
                <span className="font-medium text-sm">{currentStream.title}</span>
              </div>
              <p className="text-xs text-[hsl(var(--ua-text-muted))]">
                Configure automated research and delivery schedule
              </p>
            </div>
          )}

          {/* Frequency Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Research Frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {frequencyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFrequency(option.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    frequency === option.value
                      ? "border-[hsl(var(--ua-accent))] bg-[hsl(var(--ua-accent))]/10"
                      : "border-[hsl(var(--ua-border))] hover:bg-[hsl(var(--ua-bg-tertiary))]"
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-[hsl(var(--ua-text-muted))] mt-1">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Day Selection (for weekly/bi-weekly) */}
          {(frequency === "weekly" || frequency === "bi-weekly") && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Day of Week</label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Delivery Time</label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((timeOption) => (
                  <SelectItem key={timeOption.value} value={timeOption.value}>
                    {timeOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Preview */}
          <div className="p-3 bg-[hsl(var(--ua-bg-tertiary))] rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="w-4 h-4 text-[hsl(var(--ua-accent))]" />
              <span className="font-medium text-sm">Schedule Preview</span>
            </div>
            <p className="text-sm text-[hsl(var(--ua-text-secondary))]">{getSchedulePreview()}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Automated research
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Continuous monitoring
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              <Settings className="w-4 h-4 mr-2" />
              Set Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
