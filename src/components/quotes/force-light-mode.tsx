'use client'

import { useEffect } from 'react'

export function ForceLightMode() {
  useEffect(() => {
    document.documentElement.classList.remove('dark')

    return () => {
      // Restore theme when navigating away (SPA navigation)
      try {
        const theme = localStorage.getItem('theme')
        if (
          theme === 'dark' ||
          (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
          document.documentElement.classList.add('dark')
        }
      } catch {}
    }
  }, [])

  return null
}
