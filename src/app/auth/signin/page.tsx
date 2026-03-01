import { Suspense } from 'react'
import Link from 'next/link'
import { SignInForm } from '@/components/auth/signin-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton, FormSkeleton } from '@/components/ui/skeleton'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <SignInForm />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-gray-600 dark:text-gray-400">
            ¿No tienes una cuenta?{' '}
            <Link
              href="/auth/signup"
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Regístrate
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
