"use client"

import type React from "react"

import { ThemeProvider } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"
import { StatusBar } from "@/components/ui/status-bar"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="relative">
        {children}
        <StatusBar />
        <Toaster />
      </div>
    </ThemeProvider>
  )
}
