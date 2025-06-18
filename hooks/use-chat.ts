"use client"

import { useState, useEffect } from "react"
import { useWebSocket } from "@/lib/websocket"
import { useAuth } from "@/components/auth/auth-provider"
import type { Message } from "@/types"

export function useChat(streamId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth()
  const { on, off, sendMessage } = useWebSocket()

  // Fetch messages for a stream
  const fetchMessages = async (id: string) => {
    if (!session?.access_token || !id) return

    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chat/${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      setMessages(data)
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch messages')
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (!session?.access_token || !streamId) return

    // Initial fetch
    fetchMessages(streamId)

    // WebSocket listener for new messages
    const handleMessage = (data: { 
      id: string;
      type: string;
      content: string;
      timestamp: string;
      streamId: string;
      newsletter?: any;
      metadata?: any;
    }) => {
      // Only add message if it's for the current stream
      if (data.streamId === streamId) {
        const newMessage: Message = {
          id: data.id,
          type: data.type as any,
          content: data.content,
          timestamp: new Date(data.timestamp),
          newsletter: data.newsletter,
          metadata: data.metadata
        }
        
        setMessages(prev => [...prev, newMessage])
      }
    }

    on('message', handleMessage)

    return () => {
      off('message', handleMessage)
    }
  }, [session?.access_token, streamId, on, off])

  const sendChatMessage = (content: string) => {
    if (!streamId || !content.trim()) return

    // Add user message immediately to UI
    const userMessage: Message = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      type: "user",
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    // Send via WebSocket
    sendMessage(streamId, content)
  }

  const clearMessages = () => {
    setMessages([])
  }

  return {
    messages,
    isLoading,
    error,
    sendMessage: sendChatMessage,
    clearMessages,
    refetch: () => streamId ? fetchMessages(streamId) : null
  }
} 