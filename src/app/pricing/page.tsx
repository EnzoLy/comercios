import Image from 'next/image'
import Link from 'next/link'
import { Check, X, Star, Zap, Shield, Crown, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const freeFeatures = [
  'Hasta 50 productos',
  '1 usuario (el dueño)',
  'Registro de ventas manuales',
  'Control básico de stock',
  'Acceso desde celular o PC',
  'Demo guiada en video',
]

const freeExcluded = [
  'Reportes avanzados',
  'Control por empleado',
  'Alertas de stock',
  'Soporte personalizado',
]

const basicFeatures = [
  'Productos ilimitados',
  'Hasta 3 empleados',
  'Modo offline (sin internet)',
  'Alertas de stock bajo',
  'Cierre de caja por turno',
  'Reportes de ventas simples',
  'Historial completo de ventas',
  'Acceso desde celular, tablet y PC',
  'Soporte por WhatsApp',
]

const proFeatures = [
  'Todo lo del plan Básico',
  'Empleados ilimitados',
  'Reportes avanzados por empleado, producto y período',
  'Control de turnos y rendimiento',
  'Permisos por usuario',
  'Exportar datos a Excel / PDF',
  'Soporte prioritario',
  'Configuración inicial personalizada',
  'Importación de Excel incluida',
  'Acompañamiento 1 a 1 el primer mes',
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-processed.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-lg object-cover"
            />
            <span className="text-xl font-bold">Orbitus</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Inicio
            </Link>
            <Link href="/pricing" className="text-sm font-semibold text-foreground">
              Precios
            </Link>
          </nav>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/signin">Iniciar Sesión</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/signup">Empezar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-12 text-center">
        <Badge variant="secondary" className="mb-6 px-4 py-1 text-sm">
          Sin contrato &middot; Cancelás cuando querés
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
          Elegí el plan para tu negocio
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Desde un kiosco hasta un local con varios empleados. Tenemos el plan ideal para vos.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">

          {/* FREE */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between mb-1">
                <Zap className="h-6 w-6 text-gray-400" />
                <Badge variant="secondary">Gratis</Badge>
              </div>
              <CardTitle className="text-2xl">FREE</CardTitle>
              <CardDescription>Para probar sin riesgo</CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold tracking-tight">$0</span>
                <span className="text-muted-foreground text-sm"> / mes</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
                <li className="py-1">
                  <div className="border-t border-border" />
                </li>
                {freeExcluded.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <X className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signup?plan=free">Empezar gratis</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* BÁSICO */}
          <Card className="flex flex-col ring-2 ring-blue-500 shadow-lg shadow-blue-100/60 dark:shadow-blue-900/20">
            <CardHeader>
              <div className="flex items-center justify-between mb-1">
                <Shield className="h-6 w-6 text-blue-600" />
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                  Más vendido
                </Badge>
              </div>
              <CardTitle className="text-2xl">BÁSICO</CardTitle>
              <CardDescription>Para el comercio promedio</CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold tracking-tight">USD 30</span>
                <span className="text-muted-foreground text-sm"> / mes</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5">
                {basicFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3 flex items-start gap-2">
                <Star className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Importamos tu Excel sin costo al empezar
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/auth/signup?plan=basico">Elegir Básico</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* PRO — gradient border wrapper */}
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-purple-500 via-violet-500 to-blue-600 shadow-xl shadow-purple-200/60 dark:shadow-purple-900/30">
            <div className="bg-card rounded-[10px] flex flex-col h-full overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-1">
                  <Crown className="h-6 w-6 text-purple-600" />
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600">
                    Recomendado
                  </span>
                </div>
                <h3 className="text-2xl font-bold mt-1 text-card-foreground">PRO</h3>
                <p className="text-sm text-muted-foreground">Para dueños que quieren control total</p>
                <div className="pt-2">
                  <span className="text-4xl font-bold tracking-tight text-card-foreground">USD 49</span>
                  <span className="text-muted-foreground text-sm"> / mes</span>
                </div>
              </div>
              <div className="px-6 flex-1">
                <ul className="space-y-2.5">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-card-foreground">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-4">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 shadow-md text-white"
                >
                  <Link href="/auth/signup?plan=pro">Elegir Pro</Link>
                </Button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ¿Tenés dudas? */}
      <section className="container mx-auto px-4 pb-20">
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/40">
          <CardContent className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 mb-4">
              <MessageCircle className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¿Tenés dudas?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Hablemos por WhatsApp. Te asesoramos sin compromiso y te ayudamos a elegir el plan ideal para tu negocio.
            </p>
            <Button
              asChild
              className="bg-green-500 hover:bg-green-600 text-white shadow-md"
            >
              <a
                href="https://wa.me/542954393274"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Escribinos por WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Orbitus. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
