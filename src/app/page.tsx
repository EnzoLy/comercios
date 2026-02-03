import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, BarChart, Package, ShoppingCart } from 'lucide-react'

export default async function Home() {
  const session = await auth()

  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">Commerce System</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/auth/signin">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Empezar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Gestión de Comercio Multi-Tienda
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Solución completa para gestionar tu negocio minorista con seguimiento de inventario,
          caja de ventas y reportes detallados.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/auth/signup">Prueba Gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/signin">Iniciar Sesión</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Todo lo que Necesitas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Store className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Multi-Tienda</CardTitle>
              <CardDescription>
                Gestiona múltiples tiendas desde una sola cuenta con total aislamiento de datos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Package className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Inventario</CardTitle>
              <CardDescription>
                Controla niveles de stock, movimientos y recibe alertas de bajo inventario
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <ShoppingCart className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Caja</CardTitle>
              <CardDescription>
                Cobro rápido con escaneo de códigos de barras y múltiples métodos de pago
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart className="h-10 w-10 text-orange-600 mb-2" />
              <CardTitle>Reportes</CardTitle>
              <CardDescription>
                Análisis detallados e información sobre el rendimiento de tu negocio
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardContent className="py-16 text-center">
            <h2 className="text-3xl font-bold mb-4 text-white">¿Listo para empezar?</h2>
            <p className="text-lg mb-8 opacity-90">
              Únete a cientos de negocios que gestionan su inventario con nuestra plataforma
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/auth/signup">Crea tu Cuenta</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2025 Sistema de Gestión de Comercio. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
