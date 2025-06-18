"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { Session, User as SupabaseUser } from "@supabase/supabase-js"
import { websocketClient } from "@/lib/websocket"

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<{ error?: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        updateUserFromSupabase(session.user)
        // Connect to WebSocket with session access token
        websocketClient.connect(session.access_token)
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      
      if (session?.user) {
        updateUserFromSupabase(session.user)
        // Connect to WebSocket with session access token
        websocketClient.connect(session.access_token)
      } else {
        setUser(null)
        // Disconnect WebSocket
        websocketClient.disconnect()
      }
      
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const updateUserFromSupabase = async (supabaseUser: SupabaseUser) => {
    try {
      // Fetch user profile from our custom table
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', supabaseUser.id)
        .single()

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: profile?.name || supabaseUser.user_metadata?.name || ''
      })
    } catch (error) {
      // If profile doesn't exist, use basic user data
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || ''
      })
    }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || ''
        }
      }
    })

    if (!error && data.user) {
      // Create user profile in our custom table
      await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: name || '',
          preferences: {
            timezone: 'America/New_York',
            emailNotifications: true,
            theme: 'dark'
          }
        })
    }

    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!session && !!user,
    isLoading,
    signUp,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 