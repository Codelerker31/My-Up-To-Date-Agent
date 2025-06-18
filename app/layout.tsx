import type React from "react"
import type { Metadata } from "next"
import { Inter, Lora } from "next/font/google"
import { ThemeProvider } from "@/components/providers"
import { AuthProvider } from "@/components/auth/auth-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
})

export const metadata: Metadata = {
  title: "Your Updates Agent",
  description: "A highly intelligent conversational AI assistant designed to keep you informed",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${lora.variable} antialiased`} suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
