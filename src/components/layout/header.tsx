'use client'

import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, UserX } from 'lucide-react'
import { MobileSidebar } from './mobile-sidebar'
import { useActiveEmployee } from '@/contexts/active-employee-context'
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

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
    router.refresh()
  }

  const handleStopImpersonation = () => {
    clearImpersonation()
    toast.success('Volviste a tu usuario original')
    router.refresh()
  }

  return (
    <header className="h-16 border-b bg-white dark:bg-gray-950 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar storeSlug={storeSlug} isOwner={isOwner} role={role} />
        <h1 className="text-lg md:text-xl font-semibold">Sistema de Gestión Comercial</h1>
      </div>

      <div className="flex items-center gap-4">
        {isImpersonating && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-lg text-sm">
            <UserX className="h-4 w-4" />
            <span className="font-medium">Trabajando como: {userName}</span>
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
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
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
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
