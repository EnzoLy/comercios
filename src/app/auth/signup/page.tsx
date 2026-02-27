'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth.schema'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Store, User, Mail, Lock, Shield, Crown, Zap } from 'lucide-react'

const PLAN_INFO = {
  free: {
    label: 'GRATIS',
    description: null,
    icon: Zap,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
  basico: {
    label: 'BÁSICO',
    description: 'USD 30/mes · Sin contrato',
    icon: Shield,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  },
  pro: {
    label: 'PRO',
    description: 'USD 49/mes · Sin contrato',
    icon: Crown,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  },
} as const

type PlanKey = keyof typeof PLAN_INFO

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawPlan = searchParams.get('plan') ?? 'free'
  const plan: PlanKey = rawPlan in PLAN_INFO ? (rawPlan as PlanKey) : 'free'
  const planInfo = PLAN_INFO[plan]
  const PlanIcon = planInfo.icon

  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      storeName: '',
    },
  })

  async function onSubmit(values: SignUpInput) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al crear la cuenta')
        return
      }

      if (data.checkoutUrl) {
        toast.success('¡Cuenta creada! Redirigiendo al pago...')
        window.location.href = data.checkoutUrl
      } else {
        toast.success('¡Cuenta creada con éxito!')
        router.push(`/dashboard/${data.store.slug}`)
      }
    } catch {
      toast.error('Ocurrió un error inesperado. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image
            src="/logo-processed.png"
            alt="Orbitus"
            width={36}
            height={36}
            className="rounded-lg object-cover"
          />
          <span className="text-2xl font-bold">Orbitus</span>
        </div>

        <Card>
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Crear cuenta</CardTitle>
            <CardDescription className="text-center">
              Completá tus datos para empezar
            </CardDescription>

            {/* Plan badge */}
            <div className="flex justify-center pt-1">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${planInfo.badgeClass}`}
              >
                <PlanIcon className="h-3.5 w-3.5" />
                Plan {planInfo.label} seleccionado
              </div>
            </div>
            {planInfo.description && (
              <p className="text-xs text-center text-muted-foreground">{planInfo.description}</p>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Tu nombre</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Juan García"
                    className="pl-9"
                    disabled={isLoading}
                    {...register('name')}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="juan@example.com"
                    className="pl-9"
                    disabled={isLoading}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="pl-9"
                    disabled={isLoading}
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repetí tu contraseña"
                    className="pl-9"
                    disabled={isLoading}
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Store name */}
              <div className="space-y-1.5">
                <Label htmlFor="storeName">Nombre de tu negocio</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="storeName"
                    placeholder="Almacén El Sol"
                    className="pl-9"
                    disabled={isLoading}
                    {...register('storeName')}
                  />
                </div>
                {errors.storeName && (
                  <p className="text-xs text-destructive">{errors.storeName.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : plan === 'free' ? (
                  'Empezar gratis'
                ) : (
                  'Crear cuenta y pagar'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-0">
            <p className="text-xs text-center text-muted-foreground">
              Al registrarte aceptás los términos y condiciones del servicio.
            </p>
            <p className="text-sm text-center text-muted-foreground">
              ¿Ya tenés cuenta?{' '}
              <Link href="/auth/signin" className="text-primary hover:underline font-medium">
                Iniciar sesión
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}
