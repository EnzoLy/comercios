'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, QrCode } from 'lucide-react'

function QRLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating')
  const [message, setMessage] = useState('Validando acceso...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token no proporcionado')
      return
    }

    validateAndLogin()
  }, [token])

  const validateAndLogin = async () => {
    try {
      // Validate token
      const response = await fetch('/api/auth/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (!response.ok) {
        setStatus('error')
        setMessage(result.error || 'Error al validar token')
        return
      }

      // Token valid - create session with NextAuth
      const signInResult = await signIn('credentials', {
        email: result.data.email,
        password: '__QR_TOKEN_LOGIN__', // Special flag
        employmentId: result.data.employmentId, // Specify which employment to log into
        redirect: false,
      })

      if (signInResult?.error) {
        setStatus('error')
        setMessage('Error al crear sesión')
        return
      }

      setStatus('success')
      setMessage('Acceso concedido. Redirigiendo...')

      // Redirect to store
      setTimeout(() => {
        router.push(`/dashboard/${result.data.storeSlug}`)
      }, 1500)
    } catch (error) {
      console.error('QR login error:', error)
      setStatus('error')
      setMessage('Error inesperado')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <QrCode className="h-16 w-16" style={{ color: 'var(--color-primary)' }} />
          </div>
          <CardTitle>Acceso QR</CardTitle>
          <CardDescription>Validando tu token de acceso</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'validating' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin" style={{ color: 'var(--color-primary)' }} />
              <p className="text-center text-gray-600 dark:text-gray-400">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-center text-green-600 dark:text-green-400 font-semibold">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-center text-red-600 dark:text-red-400 font-semibold">{message}</p>
              <p className="text-sm text-gray-500 mt-2">
                Contacta a tu administrador para obtener un nuevo código QR
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function QRLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Loader2 className="h-16 w-16 animate-spin" style={{ color: 'var(--color-primary)' }} />
              </div>
              <CardTitle>Acceso QR</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <QRLoginContent />
    </Suspense>
  )
}
