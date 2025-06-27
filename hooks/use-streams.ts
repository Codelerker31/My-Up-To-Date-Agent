"use client"

import { useState, useEffect } from "react"
import { useWebSocket } from "@/lib/websocket"
import { useAuth } from "@/components/auth/auth-provider"
import type { UpdateStream } from "@/types"

export function useStreams() {
  const [streams, setStreams] = useState<UpdateStream[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth()
  const token = session?.access_token
  const { on, off } = useWebSocket()

  // Fetch streams from API
  const fetchStreams = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch streams')
      }

      const data = await response.json()
      setStreams(data)
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch streams')
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for WebSocket updates
  useEffect(() => {
    if (!token) return

    // Initial fetch
    fetchStreams()

    // WebSocket listeners
    const handleStreamsUpdated = (updatedStreams: UpdateStream[]) => {
      setStreams(updatedStreams)
    }

    const handleStreamCreated = (newStream: UpdateStream) => {
      setStreams(prev => [...prev, newStream])
    }

    const handleStreamUpdated = (data: { id: string; hasNewUpdate?: boolean; lastUpdate?: string }) => {
      setStreams(prev => prev.map(stream => 
        stream.id === data.id 
          ? { 
              ...stream, 
              hasNewUpdate: data.hasNewUpdate ?? stream.hasNewUpdate,
              lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : stream.lastUpdate
            }
          : stream
      ))
    }

    on('streams-updated', handleStreamsUpdated)
    on('stream-created', handleStreamCreated)
    on('stream-updated', handleStreamUpdated)

    return () => {
      off('streams-updated', handleStreamsUpdated)
      off('stream-created', handleStreamCreated)
      off('stream-updated', handleStreamUpdated)
    }
  }, [token, on, off])

  const createStream = async (streamData: Partial<UpdateStream>) => {
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(streamData),
      })

      if (!response.ok) {
        throw new Error('Failed to create stream')
      }

      const newStream = await response.json()
      return newStream
    } catch (error) {
      throw error
    }
  }

  const updateStream = async (id: string, updates: Partial<UpdateStream>) => {
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update stream')
      }

      const updatedStream = await response.json()
      setStreams(prev => prev.map(stream => 
        stream.id === id ? updatedStream : stream
      ))
      return updatedStream
    } catch (error) {
      throw error
    }
  }

  const deleteStream = async (id: string) => {
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete stream')
      }

      setStreams(prev => prev.filter(stream => stream.id !== id))
    } catch (error) {
      throw error
    }
  }

  return {
    streams,
    isLoading,
    error,
    createStream,
    updateStream,
    deleteStream,
    refetch: fetchStreams
  }
} 