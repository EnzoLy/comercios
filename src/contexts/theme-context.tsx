'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { AVAILABLE_THEMES, DEFAULT_THEME, type Theme } from '@/lib/themes'

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (themeId: string) => Promise<void>
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [currentTheme, setCurrentTheme] = useState<Theme>(
    AVAILABLE_THEMES[DEFAULT_THEME]
  )
  const [isLoading, setIsLoading] = useState(true)

  // Load user's theme preference
  useEffect(() => {
    if (!session?.user) {
      setIsLoading(false)
      return
    }

    // Check localStorage first for instant load
    const savedTheme = localStorage.getItem('userColorTheme')
    if (savedTheme && AVAILABLE_THEMES[savedTheme]) {
      setCurrentTheme(AVAILABLE_THEMES[savedTheme])
    } else if (
      session.user.colorTheme &&
      AVAILABLE_THEMES[session.user.colorTheme]
    ) {
      setCurrentTheme(AVAILABLE_THEMES[session.user.colorTheme])
      localStorage.setItem('userColorTheme', session.user.colorTheme)
    }

    setIsLoading(false)
  }, [session?.user])

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })
  }, [currentTheme])

  const setTheme = async (themeId: string) => {
    if (!AVAILABLE_THEMES[themeId]) {
      console.error(`Theme ${themeId} not found`)
      return
    }

    // Update local state immediately
    setCurrentTheme(AVAILABLE_THEMES[themeId])
    localStorage.setItem('userColorTheme', themeId)

    // Save to database
    try {
      const response = await fetch('/api/auth/set-color-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorTheme: themeId }),
      })

      if (!response.ok) {
        console.error('Failed to save theme preference')
        // Revert to previous theme on error
        if (session?.user?.colorTheme && AVAILABLE_THEMES[session.user.colorTheme]) {
          setCurrentTheme(AVAILABLE_THEMES[session.user.colorTheme])
        }
      }
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
