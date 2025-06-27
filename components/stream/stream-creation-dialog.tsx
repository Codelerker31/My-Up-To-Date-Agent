"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Clock, Newspaper, BookOpen, Zap, Target, Calendar } from "lucide-react"
import { useWebSocket } from "@/lib/websocket"
import { useStreams } from "@/hooks/use-streams"
import type { FocusType } from "@/types"

interface StreamCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  focusType: FocusType
  onStreamCreated?: (stream: any) => void
}

export function StreamCreationDialog({ isOpen, onClose, focusType, onStreamCreated }: StreamCreationDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium")
  const [frequency, setFrequency] = useState("weekly")
  const [dayOfWeek, setDayOfWeek] = useState("monday")
  const [time, setTime] = useState("09:00")
  const [isCreating, setIsCreating] = useState(false)
  
  // News-specific settings
  const [breakingNewsEnabled, setBreakingNewsEnabled] = useState(true)
  const [trendTracking, setTrendTracking] = useState(true)
  const [biasAnalysis, setBiasAnalysis] = useState(false)
  const [alertThreshold, setAlertThreshold] = useState("medium")
  
  // Research-specific settings
  const [methodology, setMethodology] = useState("exploratory")
  const [citationStyle, setCitationStyle] = useState("apa")
  const [academicSourcesOnly, setAcademicSourcesOnly] = useState(false)
  const [collaborationEnabled, setCollaborationEnabled] = useState(false)

  const { createStream, on, off, isConnected } = useWebSocket()
  const { refetch } = useStreams()

  // Debug WebSocket connection
  useEffect(() => {
    console.log('WebSocket connection status:', isConnected)
  }, [isConnected])

  // Listen for stream creation events
  useEffect(() => {
    const handleStreamCreated = (stream: any) => {
      console.log('Stream created successfully:', stream)
      setIsCreating(false)
      resetForm()
      onClose()
      
      // Refresh streams list
      setTimeout(() => refetch(), 500)
      
      // Notify parent component if needed
      if (onStreamCreated) {
        onStreamCreated(stream)
      }
    }

    const handleError = (error: any) => {
      console.error('Error creating stream:', error)
      setIsCreating(false)
      // Show error message to user (you could add a toast here)
      alert('Failed to create stream: ' + (error.message || 'Unknown error'))
    }

    on('stream-created', handleStreamCreated)
    on('error', handleError)

    return () => {
      off('stream-created', handleStreamCreated)
      off('error', handleError)
    }
  }, [on, off, onClose, refetch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (!isConnected) {
      alert('WebSocket not connected. Please wait and try again.')
      return
    }

    setIsCreating(true)
    
    try {
      const streamData = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || "General",
        priority,
        focusType,
        frequency,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
        time,
        is_active: true,
        // Focus-specific configurations
        ...(focusType === "news" ? {
          newsConfig: {
            breaking_news_enabled: breakingNewsEnabled,
            trend_tracking: trendTracking,
            bias_analysis_enabled: biasAnalysis,
            alert_threshold: alertThreshold,
            source_types: ["news", "social", "rss"]
          }
        } : {
          researchConfig: {
            methodology,
            citation_style: citationStyle,
            academic_sources_only: academicSourcesOnly,
            collaboration_enabled: collaborationEnabled,
            export_format: "pdf"
          }
        })
      }

      console.log('Creating stream with data:', streamData)
      
      // Create stream via WebSocket
      createStream(streamData)
      
      // Don't close dialog immediately - wait for response
    } catch (error) {
      console.error("Error creating stream:", error)
      setIsCreating(false)
      alert('Failed to create stream: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCategory("")
    setPriority("medium")
    setFrequency("weekly")
    setDayOfWeek("monday")
    setTime("09:00")
    setBreakingNewsEnabled(true)
    setTrendTracking(true)
    setBiasAnalysis(false)
    setAlertThreshold("medium")
    setMethodology("exploratory")
    setCitationStyle("apa")
    setAcademicSourcesOnly(false)
    setCollaborationEnabled(false)
  }

  const handleClose = () => {
    if (!isCreating) {
      resetForm()
      onClose()
    }
  }

  const getFocusIcon = () => {
    return focusType === "news" ? Newspaper : BookOpen
  }

  const getFocusTitle = () => {
    return focusType === "news" ? "Create News Stream" : "Create Research Project"
  }

  const getFocusDescription = () => {
    return focusType === "news" 
      ? "Set up automated news monitoring and alerts for breaking developments"
      : "Create an in-depth research project with scheduled updates and analysis"
  }

  const categories = focusType === "news" 
    ? ["Breaking News", "Technology", "Politics", "Business", "Science", "Sports", "Entertainment"]
    : ["Academic Research", "Market Analysis", "Technical Review", "Personal Interest", "Competitive Intelligence"]

  const FocusIcon = getFocusIcon()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FocusIcon className="w-5 h-5" />
            {getFocusTitle()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getFocusDescription()}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                {focusType === "news" ? "News Topic" : "Research Topic"} *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={focusType === "news" 
                  ? "e.g., AI Technology Breakthroughs" 
                  : "e.g., Climate Change Impact on Agriculture"
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={focusType === "news"
                  ? "Describe what news developments you want to monitor..."
                  : "Describe the research scope and objectives..."
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as "high" | "medium" | "low")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-yellow-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-500" />
                        Low
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Schedule Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <Label className="text-base font-medium">Update Schedule</Label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {frequency === "weekly" && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="tuesday">Tuesday</SelectItem>
                      <SelectItem value="wednesday">Wednesday</SelectItem>
                      <SelectItem value="thursday">Thursday</SelectItem>
                      <SelectItem value="friday">Friday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Focus-specific Settings */}
          {focusType === "news" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4" />
                <Label className="text-base font-medium">News Settings</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="breakingNews">Breaking News Alerts</Label>
                  <Switch
                    id="breakingNews"
                    checked={breakingNewsEnabled}
                    onCheckedChange={setBreakingNewsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="trendTracking">Trend Tracking</Label>
                  <Switch
                    id="trendTracking"
                    checked={trendTracking}
                    onCheckedChange={setTrendTracking}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="biasAnalysis">Bias Analysis</Label>
                  <Switch
                    id="biasAnalysis"
                    checked={biasAnalysis}
                    onCheckedChange={setBiasAnalysis}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alertThreshold">Alert Threshold</Label>
                  <Select value={alertThreshold} onValueChange={setAlertThreshold}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (All Updates)</SelectItem>
                      <SelectItem value="medium">Medium (Important)</SelectItem>
                      <SelectItem value="high">High (Critical Only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <Label className="text-base font-medium">Research Settings</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="methodology">Methodology</Label>
                  <Select value={methodology} onValueChange={setMethodology}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="systematic-review">Systematic Review</SelectItem>
                      <SelectItem value="literature-review">Literature Review</SelectItem>
                      <SelectItem value="competitive-analysis">Competitive Analysis</SelectItem>
                      <SelectItem value="exploratory">Exploratory Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="citationStyle">Citation Style</Label>
                  <Select value={citationStyle} onValueChange={setCitationStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apa">APA</SelectItem>
                      <SelectItem value="mla">MLA</SelectItem>
                      <SelectItem value="chicago">Chicago</SelectItem>
                      <SelectItem value="ieee">IEEE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="academicSources">Academic Sources Only</Label>
                  <Switch
                    id="academicSources"
                    checked={academicSourcesOnly}
                    onCheckedChange={setAcademicSourcesOnly}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="collaboration">Enable Collaboration</Label>
                  <Switch
                    id="collaboration"
                    checked={collaborationEnabled}
                    onCheckedChange={setCollaborationEnabled}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isCreating || !isConnected}
              className="min-w-[120px]"
            >
              {isCreating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : !isConnected ? (
                "Connecting..."
              ) : (
                `Create ${focusType === "news" ? "Stream" : "Project"}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
