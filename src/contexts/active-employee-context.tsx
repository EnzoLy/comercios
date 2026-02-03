'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'

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
  const storeSlug = params?.storeSlug as string | undefined
  const [activeEmployee, setActiveEmployeeState] = useState<ActiveEmployee | null>(null)

  // Initialize from session or localStorage
  useEffect(() => {
    // Check localStorage for QR login data first (before session check)
    const qrStoreSlug = localStorage.getItem('qrStoreSlug')
    const qrEmployeeName = localStorage.getItem('qrEmployeeName')
    const qrEmployeeRole = localStorage.getItem('qrEmployeeRole')
    const qrUsed = localStorage.getItem('qrUsed')

    // If we have QR data and haven't used it yet
    if (qrStoreSlug && qrEmployeeName && qrEmployeeRole && !qrUsed) {
      // Set the flag to mark as used
      localStorage.setItem('qrUsed', 'true')

      // Set activeEmployee from QR login data
      setActiveEmployeeState({
        id: typeof window !== 'undefined' ? (Math.random().toString()) : 'qr-employee', // Temporary ID
        name: qrEmployeeName,
        role: qrEmployeeRole,
        isOwner: false,
      })
      return
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
  }, [session, storeSlug])

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

    // Clear QR login data
    localStorage.removeItem('qrEmploymentId')
    localStorage.removeItem('qrEmployeeName')
    localStorage.removeItem('qrEmployeeRole')
    localStorage.removeItem('qrStoreSlug')
    localStorage.removeItem('qrUsed')

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
