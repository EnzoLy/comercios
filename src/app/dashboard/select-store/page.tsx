import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, Clock } from 'lucide-react'
import { getRepository } from '@/lib/db'
import { Store } from '@/lib/db/entities/store.entity'
import { SubscriptionService } from '@/lib/services/subscription.service'

export default async function SelectStorePage() {
  const session = await requireAuth()

  // Fetch subscription data for each store
  const storeRepo = await getRepository(Store)
  const storesWithSubscription = await Promise.all(
    session.user.stores.map(async (userStore) => {
      const store = await storeRepo.findOne({ where: { id: userStore.storeId } })
      const daysRemaining = store ? SubscriptionService.calculateDaysRemaining(store.subscriptionEndDate) : null

      return {
        ...userStore,
        subscription: store ? {
          status: store.subscriptionStatus,
          isPermanent: store.isPermanent,
          endDate: store.subscriptionEndDate,
          daysRemaining,
        } : null
      }
    })
  )

  // If user has only one store and it's not expired (or user is SUPER_ADMIN), redirect directly
  if (session.user.stores.length === 1) {
    const singleStore = storesWithSubscription[0]
    const isExpired = singleStore.subscription?.status === 'EXPIRED'
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

    if (!isExpired || isSuperAdmin) {
      redirect(`/dashboard/${session.user.stores[0].slug}`)
    }
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
            {storesWithSubscription.map((store) => {
              const isExpired = store.subscription?.status === 'EXPIRED'
              const isExpiringSoon = store.subscription?.status === 'EXPIRING_SOON'
              const daysRemaining = store.subscription?.daysRemaining ?? null
              const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

              return (
                <Card key={store.storeId} className={`hover:shadow-lg transition-shadow ${isExpired ? 'border-red-300 bg-red-50/50' : ''}`}>
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
                  <CardContent className="space-y-3">
                    {/* Subscription Alerts */}
                    {isExpired && !isSuperAdmin && (
                      <Alert variant="destructive" className="bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Suscripción Expirada</AlertTitle>
                        <AlertDescription className="text-sm">
                          Contacta al administrador para renovar el acceso a esta tienda
                        </AlertDescription>
                      </Alert>
                    )}

                    {isExpiringSoon && daysRemaining !== null && daysRemaining >= 0 && !store.subscription?.isPermanent && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-800">Suscripción por Expirar</AlertTitle>
                        <AlertDescription className="text-sm text-yellow-700">
                          {daysRemaining} día{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}
                        </AlertDescription>
                      </Alert>
                    )}

                    {isSuperAdmin && isExpired && (
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertDescription className="text-sm text-blue-700">
                          Acceso de Super Admin - Suscripción expirada para usuarios normales
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      asChild={!isExpired || isSuperAdmin}
                      className="w-full"
                      disabled={isExpired && !isSuperAdmin}
                    >
                      {(!isExpired || isSuperAdmin) ? (
                        <Link href={`/dashboard/${store.slug}`}>
                          Abrir Tienda
                        </Link>
                      ) : (
                        <span>Suscripción Expirada</span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
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
