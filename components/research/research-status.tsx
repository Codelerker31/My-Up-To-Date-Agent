"use client"

import { useState, useEffect } from "react"
import { Search, FileText, Brain, CheckCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const researchSteps = [
  { id: "search", label: "Discovering sources", icon: Search },
  { id: "analyze", label: "Analyzing content", icon: FileText },
  { id: "synthesize", label: "Synthesizing insights", icon: Brain },
  { id: "complete", label: "Finalizing report", icon: CheckCircle },
]

export function ResearchStatus() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStep((step) => Math.min(step + 1, researchSteps.length - 1))
          return 0
        }
        return prev + 10
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-4 bg-[hsl(var(--ua-bg-secondary))] border-b border-[hsl(var(--ua-border))]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {researchSteps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <div
                key={step.id}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-all ${
                  isActive
                    ? "bg-[hsl(var(--ua-accent))]/20 text-[hsl(var(--ua-accent))]"
                    : isCompleted
                      ? "bg-green-500/20 text-green-600"
                      : "text-[hsl(var(--ua-text-muted))]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{step.label}</span>
              </div>
            )
          })}
        </div>

        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </div>
  )
}
