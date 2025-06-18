"use client"

import { useState } from "react"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"
import { useAuth } from "./auth-provider"

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Updates Agent</h1>
          <p className="text-gray-600">
            Your AI-powered research assistant for staying informed
          </p>
        </div>
        
        {isLogin ? (
          <LoginForm
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  )
} 