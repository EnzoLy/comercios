'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useSearchParams } from 'next/navigation'

interface ActiveEmployee {
  id: string
  name: string
  role: string
  isOwner: boolean
}

interface ActiveEmployeeContextType {
  activeEmployee: ActiveEmployee | null
  setActiveEmployee: (employee: ActiveEmployee | null) => void
  isImpersonating: boolean
  clearImpersonation: () => void
}

const ActiveEmployeeContext = createContext<ActiveEmployeeContextType | undefined>(undefined)

export function ActiveEmployeeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const params = useParams()
  const searchParams = useSearchParams()
  const storeSlug = params?.storeSlug as string | undefined
  const [activeEmployee, setActiveEmployeeState] = useState<ActiveEmployee | null>(null)
  const [qrProcessed, setQrProcessed] = useState(false)

  // Initialize from session or query params
  useEffect(() => {
    // Check query params for QR login data first
    const qrRole = searchParams?.get('qrRole')
    const qrName = searchParams?.get('qrName')

    // If we have QR data and haven't processed it yet
    if (qrRole && qrName && !qrProcessed && session?.user?.id) {
      // Set activeEmployee from QR login data
      setActiveEmployeeState({
        id: session.user.id,
        name: qrName,
        role: qrRole,
        isOwner: false,
      })
      setQrProcessed(true)
      return
    }

    // If QR data is empty and we already processed, continue to normal flow
    if (!qrRole && qrProcessed) {
      // QR data was processed and cleared, continue normal
    }

    // Now check session
    if (!session?.user || !storeSlug) {
      setActiveEmployeeState(null)
      return
    }

    const store = session.user.stores.find((s) => s.slug === storeSlug)
    if (!store) {
      setActiveEmployeeState(null)
      return
    }

    // Check localStorage for active employee override (manual impersonation)
    const activeUserId = localStorage.getItem('activeUserId')
    const activeUserName = localStorage.getItem('activeUserName')
    const activeUserRole = localStorage.getItem('activeUserRole')
    const activeUserIsOwner = localStorage.getItem('activeUserIsOwner')

    if (activeUserId && activeUserName && activeUserRole && activeUserIsOwner) {
      // Using impersonated employee
      setActiveEmployeeState({
        id: activeUserId,
        name: activeUserName,
        role: activeUserRole,
        isOwner: activeUserIsOwner === 'true',
      })
    } else {
      // Using session user (owner/admin)
      setActiveEmployeeState({
        id: session.user.id,
        name: session.user.name || '',
        role: store.employmentRole,
        isOwner: store.isOwner,
      })
    }
  }, [session, storeSlug, searchParams, qrProcessed])

  const setActiveEmployee = (employee: ActiveEmployee | null) => {
    if (employee) {
      // Save to localStorage
      localStorage.setItem('activeUserId', employee.id)
      localStorage.setItem('activeUserName', employee.name)
      localStorage.setItem('activeUserRole', employee.role)
      localStorage.setItem('activeUserIsOwner', employee.isOwner.toString())
      setActiveEmployeeState(employee)
    } else {
      clearImpersonation()
    }
  }

  const clearImpersonation = () => {
    // Clear manual impersonation data
    localStorage.removeItem('activeUserId')
    localStorage.removeItem('activeUserName')
    localStorage.removeItem('activeUserRole')
    localStorage.removeItem('activeUserIsOwner')

    // Clear QR flag
    setQrProcessed(false)

    // Restore to session user
    if (session?.user && storeSlug) {
      const store = session.user.stores.find((s) => s.slug === storeSlug)
      if (store) {
        setActiveEmployeeState({
          id: session.user.id,
          name: session.user.name || '',
          role: store.employmentRole,
          isOwner: store.isOwner,
        })
      }
    } else {
      setActiveEmployeeState(null)
    }
  }

  const isImpersonating = activeEmployee !== null && session?.user?.id !== activeEmployee.id

  return (
    <ActiveEmployeeContext.Provider
      value={{
        activeEmployee,
        setActiveEmployee,
        isImpersonating,
        clearImpersonation,
      }}
    >
      {children}
    </ActiveEmployeeContext.Provider>
  )
}

export function useActiveEmployee() {
  const context = useContext(ActiveEmployeeContext)
  if (context === undefined) {
    throw new Error('useActiveEmployee must be used within ActiveEmployeeProvider')
  }
  return context
}
