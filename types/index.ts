export interface UpdateStream {
  id: string
  title: string
  hasNewUpdate: boolean
  lastUpdate: Date
  frequency: string
  category?: string
  priority: "high" | "medium" | "low"
  sources: number
  insights: number
  color: "emerald" | "blue" | "purple" | "orange"
  isActive?: boolean
  nextUpdate?: Date
  schedule?: {
    frequency: string
    dayOfWeek?: string
    time: string
  }
}

export interface Newsletter {
  id: string
  title: string
  summary: string
  content: string
  generatedAt: Date
  confidence?: number
  sources?: string[]
  keyInsights?: string[]
  isAutomated?: boolean
  scheduleInfo?: {
    frequency: string
    nextUpdate: Date
    reportNumber: number
  }
}

export interface Message {
  id: string
  type: "user" | "agent" | "newsletter" | "research_update" | "insight" | "schedule_request" | "schedule_confirmation"
  content: string
  timestamp: Date
  newsletter?: Newsletter
  metadata?: {
    confidence?: number
    sources?: string[]
    researchPhase?: string
    sourcesFound?: number
    isAutomated?: boolean
    scheduleOptions?: string[]
    schedule?: {
      frequency: string
      dayOfWeek?: string
      time: string
      nextUpdate?: Date
    }
  }
}

export interface ResearchSession {
  id: string
  streamId: string
  status: "active" | "completed" | "failed"
  startTime: Date
  endTime?: Date
  sourcesAnalyzed: number
  keyFindings: number
  confidence: number
  methodology: string[]
  isAutomated?: boolean
}
