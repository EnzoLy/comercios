'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/password.schema'
import { ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react'
import { signOut } from 'next-auth/react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data: ChangePasswordInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Error al cambiar la contraseña')
        return
      }

      setIsSuccess(true)
      toast.success('Contraseña actualizada con éxito')

      // Force re-login to update session
      setTimeout(() => {
        signOut({ callbackUrl: '/auth/signin' })
      }, 2000)
    } catch (error) {
      toast.error('Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-indigo-950 p-4">
        <Card className="max-w-md w-full border-none shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">¡Contraseña Actualizada!</CardTitle>
            <CardDescription className="text-base text-gray-600 dark:text-gray-400">
              Tu contraseña ha sido cambiada correctamente. Serás redirigido a la página de inicio de sesión en unos segundos...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-indigo-950 p-4">
      <Card className="max-w-md w-full border-none shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Acción Requerida</span>
          </div>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            Cambia tu contraseña
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Como nuevo empleado, por razones de seguridad debes cambiar la contraseña proporcionada inicialmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  {...register('currentPassword')}
                />
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500 font-medium">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  {...register('newPassword')}
                />
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-500 font-medium">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg hover:shadow-blue-500/25"
              disabled={isLoading}
            >
              {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-center w-full text-gray-500">
            Tu nueva contraseña debe ser diferente a la temporal.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
