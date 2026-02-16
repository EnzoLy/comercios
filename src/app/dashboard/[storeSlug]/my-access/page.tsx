'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useStore } from '@/hooks/use-store'
import { usePermission } from '@/hooks/use-permission'
import { useActiveEmployee } from '@/contexts/active-employee-context'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GenerateQRDialog } from '@/components/employees/generate-qr-dialog'
import { QrCode, ShieldCheck, Mail, User, Info, Smartphone, Link as LinkIcon, Lock, ChevronRight, Fingerprint, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function MyAccessPage() {
  const store = useStore()
  const { data: session } = useSession()
  const { activeEmployee } = useActiveEmployee()
  const [employment, setEmployment] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

  useEffect(() => {
    if (store && session?.user?.id) {
      loadEmployment()
    }
  }, [store, session?.user?.id, activeEmployee])

  const loadEmployment = async () => {
    if (!store || !session?.user?.id) return

    setIsLoading(true)
    try {
      // If activeEmployee exists, find their employment
      if (activeEmployee) {
        // If we have employmentId from QR, use it directly
        if (activeEmployee.employmentId) {
          const employmentFromQR = {
            id: activeEmployee.employmentId,
            userId: activeEmployee.id,
            storeId: store.storeId,
            role: activeEmployee.role,
            isActive: true,
            user: {
              id: activeEmployee.id,
              name: activeEmployee.name,
              email: session.user.email || '',
              role: 'USER',
            },
            store: {
              id: store.storeId,
              name: store.name || '',
              slug: store.slug,
            },
          }
          setEmployment(employmentFromQR)
        } else {
          // No employmentId, need to fetch all employees and find the one matching activeEmployee
          const response = await fetch(`/api/stores/${store.storeId}/employees`)
          if (!response.ok) throw new Error('Failed to load employees')

          const employees = await response.json()
          const activeEmpData = employees.find((e: any) => e.userId === activeEmployee.id)

          if (activeEmpData) {
            setEmployment(activeEmpData)
          } else {
            toast.error('No se encontró el empleado activo')
          }
        }
      } else {
        // No activeEmployee, get the session user's employment
        const response = await fetch(`/api/stores/${store.storeId}/employments/me`)
        if (!response.ok) throw new Error('Failed to load employment')

        const currentEmployment = await response.json()
        setEmployment(currentEmployment)
      }
    } catch (error) {
      toast.error('Error al cargar tu información')
      console.error('Load employment error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Fingerprint className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
        </div>
        <p className="mt-6 text-muted-foreground font-medium animate-pulse">Sincronizando credenciales...</p>
      </div>
    )
  }

  if (!employment) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold mb-2">Acceso No Disponible</h3>
            <p className="text-muted-foreground">
              No se pudo vincular tu perfil con este comercio. Contacta al administrador para verificar tu estado.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            Mi <span className="gradient-text">Acceso</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Credenciales de acceso rápido y seguridad.
          </p>
        </div>
        <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-bold">
          ID Empleado: {employment.id.slice(0, 8).toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile and QR Generation Card */}
        <Card className="lg:col-span-7 border-none bg-card/40 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Acceso Sin Contraseña
            </CardTitle>
            <CardDescription className="text-balance">
              Genere un pase digital para entrar a la terminal de ventas de forma instantánea.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Action Card Inner */}
            <div className="p-6 rounded-3xl bg-muted/40 border border-border space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-black leading-none">{employment.user.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 italic">
                    <Mail className="h-3 w-3" /> {employment.user.email}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase">
                      {employment.role}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-black uppercase border-emerald-500/30 text-emerald-600 bg-emerald-50/50">
                      Activo
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4 text-sm text-muted-foreground font-medium">
                <p className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  Al generar un código nuevo, cualquier pase anterior quedará invalidado inmediatamente.
                </p>
                <p className="flex items-start gap-3 leading-relaxed">
                  <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  El acceso tiene una validez de 24 horas para garantizar la seguridad de la terminal.
                </p>
              </div>

              <Button
                onClick={() => setQrDialogOpen(true)}
                size="lg"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              >
                <QrCode className="mr-3 h-6 w-6" />
                Generar Pase Digital
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Side */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none bg-muted/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                Instrucciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  icon: <Plus className="h-4 w-4" />,
                  title: "Crear",
                  desc: "Pulse el botón para generar su credencial temporal."
                },
                {
                  icon: <LinkIcon className="h-4 w-4" />,
                  title: "Vincular",
                  desc: "Escanee el QR con la cámara de su móvil o copie el enlace."
                },
                {
                  icon: <ChevronRight className="h-4 w-4" />,
                  title: "Entrar",
                  desc: "Acceso automático al dashboard de ventas sin credenciales."
                }
              ].map((step, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="h-10 w-10 rounded-xl bg-background shadow-sm border border-border flex items-center justify-center shrink-0 font-bold group-hover:border-primary/50 transition-colors">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Alert className="border-amber-500/20 bg-amber-500/5 rounded-2xl p-4">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-[11px] font-bold text-amber-700/80 uppercase tracking-wider ml-2">
              Uso Personal Obligatorio. Compartir su acceso puede resultar en la suspensión de la cuenta.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* QR Dialog */}
      {employment && store && (
        <GenerateQRDialog
          isOpen={qrDialogOpen}
          employmentId={employment.id}
          storeId={store.storeId}
          onOpenChange={setQrDialogOpen}
        />
      )}
    </div>
  )
}
