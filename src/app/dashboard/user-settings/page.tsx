'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { ActiveEmployeeProvider } from '@/contexts/active-employee-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Key, User, ArrowLeft, Shield } from 'lucide-react'
import { ChangePasswordForm } from '@/components/user-settings/change-password-form'
import { UserPinForm } from '@/components/user-settings/user-pin-form'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function UserSettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  // Verificar si hay impersonación activa
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user) {
      const activeUserId = localStorage.getItem('activeUserId')

      // Si hay un activeUserId diferente al usuario de la sesión, está impersonando
      if (activeUserId && activeUserId !== session.user.id) {
        router.push('/dashboard')
      }
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (!session?.user) {
    redirect('/auth/signin')
  }

  const hasStores = session.user.stores && session.user.stores.length > 0
  const defaultStore = hasStores ? session.user.stores[0] : null

  return (
    <ActiveEmployeeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          userName={session.user.name || 'Usuario'}
          storeSlug={defaultStore?.slug || ''}
          isOwner={defaultStore?.isOwner || false}
          isImpersonating={false}
          role={session.user.role}
          plan="FREE"
        />
        <main className="min-h-[calc(100vh-68px)]">
          <div className="p-4 md:p-8 space-y-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">Configuración de Usuario</h1>
              <p className="text-muted-foreground mt-2">
                Administra tu cuenta y preferencias personales
              </p>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Sesión segura:</strong> Estás accediendo como <strong>{session.user.name}</strong> ({session.user.email}).
                Esta página solo está disponible para el propietario de la cuenta.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-2">
                <TabsTrigger value="password" className="gap-2">
                  <Lock className="h-4 w-4" />
                  Contraseña
                </TabsTrigger>
                <TabsTrigger value="pin" className="gap-2">
                  <Key className="h-4 w-4" />
                  PIN de Usuario
                </TabsTrigger>
              </TabsList>

              {/* Tab de Contraseña */}
              <TabsContent value="password" className="space-y-6 mt-6">
                <ChangePasswordForm />
              </TabsContent>

              {/* Tab de PIN */}
              <TabsContent value="pin" className="space-y-6 mt-6">
                <UserPinForm />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </ActiveEmployeeProvider>
  )
}
