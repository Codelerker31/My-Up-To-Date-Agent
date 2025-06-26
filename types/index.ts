// Focus types for dual-focus architecture
export type FocusType = "news" | "research"

// News-specific configuration
export interface NewsStreamConfig {
  alertThreshold: number
  sourceTypes: string[]
  breakingNewsEnabled: boolean
  trendTracking: boolean
  biasAnalysisEnabled: boolean
  realTimeAlerts: boolean
  maxArticlesPerHour: number
}

// Research-specific configuration
export interface ResearchProjectConfig {
  methodology: string[]
  citationStyle: string
  collaborationEnabled: boolean
  exportFormat: string
  academicSourcesOnly: boolean
  minSourceQuality: number
  researchDepth: "quick" | "standard" | "comprehensive"
}

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
  focusType: FocusType
  isActive?: boolean
  nextUpdate?: Date
  schedule?: {
    frequency: string
    dayOfWeek?: string
    time: string
  }
  newsConfig?: NewsStreamConfig
  researchConfig?: ResearchProjectConfig
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
  focusType?: FocusType
  scheduleInfo?: {
    frequency: string
    nextUpdate: Date
    reportNumber: number
  }
}

export interface Message {
  id: string
  type: "user" | "agent" | "newsletter" | "research_update" | "insight" | "schedule_request" | "schedule_confirmation" | "news_alert"
  content: string
  timestamp: Date
  newsletter?: Newsletter
  metadata?: {
    confidence?: number
    sources?: string[]
    researchPhase?: string
    sourcesFound?: number
    isAutomated?: boolean
    focusType?: FocusType
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
  focusType?: FocusType
}

// New interfaces for dual-focus features

export interface NewsAlert {
  id: string
  title: string
  content: string
  sourceUrl?: string
  importanceScore: number
  alertType: "breaking" | "trending" | "update"
  isRead: boolean
  sentAt: Date
  streamTitle: string
}

export interface ContentSource {
  id: string
  url: string
  title?: string
  sourceType: "news" | "academic" | "blog" | "social" | "government" | "organization"
  credibilityScore: number
  biasRating?: "left" | "center" | "right" | "unknown"
  academicTier?: number
  isActive: boolean
  lastChecked: Date
  metadata?: Record<string, any>
}

export interface Citation {
  id: string
  citationText: string
  citationStyle: string
  pageNumber?: string
  quoteText?: string
  context?: string
  sourceUrl?: string
  sourceTitle?: string
  createdAt: Date
}

// Enhanced interfaces for better type safety

export interface CreateStreamRequest {
  title: string
  description?: string
  category?: string
  priority?: "high" | "medium" | "low"
  color?: "emerald" | "blue" | "purple" | "orange"
  focusType: FocusType
  frequency?: string
  dayOfWeek?: string
  time?: string
  newsConfig?: Partial<NewsStreamConfig>
  researchConfig?: Partial<ResearchProjectConfig>
}

export interface UpdateStreamRequest extends Partial<CreateStreamRequest> {
  id: string
}

// Application state interfaces

export interface AppState {
  currentFocus: FocusType
  streams: UpdateStream[]
  activeStreamId?: string
  newsAlerts: NewsAlert[]
  unreadAlertsCount: number
}

export interface FocusContextType {
  currentFocus: FocusType
  setCurrentFocus: (focus: FocusType) => void
  isNewsMode: boolean
  isResearchMode: boolean
}

// API Response types

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface StreamsResponse {
  streams: UpdateStream[]
  totalCount: number
  newsCount: number
  researchCount: number
}

export interface NewsAlertsResponse {
  alerts: NewsAlert[]
  unreadCount: number
  totalCount: number
}

export interface CitationsResponse {
  citations: Citation[]
  totalCount: number
}

// WebSocket event types

export interface WebSocketEvents {
  'authenticate': { token: string }
  'send-message': { streamId: string; content: string }
  'create-stream': CreateStreamRequest
  'update-schedule': { streamId: string; schedule: any }
  'trigger-research': { streamId: string }
  'switch-focus': { focusType: FocusType }
  'configure-news-stream': { streamId: string; config: NewsStreamConfig }
  'configure-research-project': { streamId: string; config: ResearchProjectConfig }
  'mark-alert-read': { alertId: string }
  'export-research': { streamId: string; format: string }
}

// UI Component props interfaces

export interface FocusToggleProps {
  currentFocus: FocusType
  onFocusChange: (focus: FocusType) => void
  newsCount: number
  researchCount: number
  unreadAlertsCount?: number
}

export interface NewsTimelineProps {
  alerts: NewsAlert[]
  onAlertClick: (alert: NewsAlert) => void
  onMarkAsRead: (alertId: string) => void
}

export interface ResearchDashboardProps {
  projects: UpdateStream[]
  citations: Citation[]
  onProjectSelect: (projectId: string) => void
  onExportProject: (projectId: string, format: string) => void
}

export interface CitationManagerProps {
  citations: Citation[]
  onAddCitation: (citation: Omit<Citation, 'id' | 'createdAt'>) => void
  onEditCitation: (citation: Citation) => void
  onDeleteCitation: (citationId: string) => void
  citationStyle: string
  onStyleChange: (style: string) => void
}
