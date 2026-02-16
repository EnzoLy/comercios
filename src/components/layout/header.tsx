'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, UserX, Lock, Palette, Settings } from 'lucide-react'
import { MobileSidebar } from './mobile-sidebar'
import { useActiveEmployee } from '@/contexts/active-employee-context'
import { OwnerPinDialog } from '@/components/auth/owner-pin-dialog'
import { SetOwnerPinDialog } from '@/components/auth/set-owner-pin-dialog'
import { ThemeSelector } from '@/components/theme/theme-selector'
import { toast } from 'sonner'

interface HeaderProps {
  userName: string
  storeSlug: string
  isOwner: boolean
  isImpersonating?: boolean
  role?: string
}

export function Header({ userName, storeSlug, isOwner, isImpersonating, role }: HeaderProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { clearImpersonation } = useActiveEmployee()
  const [showOwnerPinDialog, setShowOwnerPinDialog] = useState(false)
  const [showSetOwnerPinDialog, setShowSetOwnerPinDialog] = useState(false)
  const [showThemeSelector, setShowThemeSelector] = useState(false)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
    router.refresh()
  }

  const handleStopImpersonation = () => {
    // If owner is impersonating, require PIN verification
    if (isImpersonating && isOwner) {
      setShowOwnerPinDialog(true)
    } else {
      clearImpersonation()
      toast.success('Volviste a tu usuario original')
      router.refresh()
    }
  }

  const handleOwnerPinSuccess = () => {
    setShowOwnerPinDialog(false)
    clearImpersonation()
    toast.success('Volviste a tu usuario original')
    router.refresh()
  }

  const handleOwnerNoPin = () => {
    setShowOwnerPinDialog(false)
    setShowSetOwnerPinDialog(true)
  }

  const handleSetPinSuccess = () => {
    setShowSetOwnerPinDialog(false)
    // Si fue desde impersonación, hace refresh; si no, solo cierra
    if (showOwnerPinDialog) {
      handleOwnerPinSuccess()
    } else {
      toast.success('PIN configurado correctamente')
    }
  }

  return (
    <header className="h-17 border-b bg-white flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar storeSlug={storeSlug} isOwner={isOwner} role={role} />
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Image src="/logo-processed.png" alt="Logo" width={32} height={32} className="rounded-lg object-cover" />
          <h1 className="text-lg md:text-xl font-semibold">Orbitus Gestión</h1>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {isImpersonating && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
            <UserX className="h-4 w-4" />
            <span>Trabajando como: {userName}</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              {userName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                {isImpersonating && (
                  <p className="text-xs font-medium mt-1 dark:text-opacity-90" style={{ color: 'var(--color-primary)' }}>
                    Sesión temporal
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isImpersonating && (
              <>
                <DropdownMenuItem onClick={handleStopImpersonation}>
                  <UserX className="mr-2 h-4 w-4" />
                  Volver a {session?.user?.name}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {!isImpersonating && (
              <DropdownMenuItem onClick={() => router.push('/dashboard/user-settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración de Usuario
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowThemeSelector(true)}>
              <Palette className="mr-2 h-4 w-4" />
              Tema de Color
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Owner PIN Dialog */}
      <OwnerPinDialog
        isOpen={showOwnerPinDialog}
        userName={session?.user?.name || 'Propietario'}
        onSuccess={handleOwnerPinSuccess}
        onNoPin={handleOwnerNoPin}
        onCancel={() => setShowOwnerPinDialog(false)}
      />

      {/* Set Owner PIN Dialog */}
      <SetOwnerPinDialog
        isOpen={showSetOwnerPinDialog}
        userName={session?.user?.name || 'Propietario'}
        onSuccess={handleSetPinSuccess}
        onCancel={() => setShowSetOwnerPinDialog(false)}
      />

      {/* Theme Selector Dialog */}
      <ThemeSelector
        isOpen={showThemeSelector}
        onOpenChange={setShowThemeSelector}
      />
    </header>
  )
}
