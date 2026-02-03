import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function SelectStorePage() {
  const session = await requireAuth()

  // If user has only one store, redirect directly
  if (session.user.stores.length === 1) {
    redirect(`/dashboard/${session.user.stores[0].slug}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Seleccionar una Tienda</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Elige qué tienda deseas administrar
          </p>
        </div>

        {session.user.stores.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No se Encontraron Tiendas</CardTitle>
              <CardDescription>
                Aún no tienes acceso a ninguna tienda. Crea tu primera tienda para comenzar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/stores/new">Crear Tienda</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.user.stores.map((store) => (
              <Card key={store.storeId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{store.slug}</span>
                    {store.isOwner && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Propietario
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Rol: {store.employmentRole}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={`/dashboard/${store.slug}`}>
                      Abrir Tienda
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {session.user.stores.length > 0 && (
          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/stores/new">Crear Nueva Tienda</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
