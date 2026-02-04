import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Truck, Building2 } from 'lucide-react'
import { SupplierExportButton } from '@/components/suppliers/supplier-export-button'
import { SupplierImportButton } from '@/components/suppliers/supplier-import-button'

export default async function SuppliersPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const supplierRepo = dataSource.getRepository(Supplier)

  const suppliers = await supplierRepo.find({
    where: { storeId: context.storeId },
    relations: ['contacts'],
    order: { createdAt: 'DESC' },
  })

  const activeSuppliers = suppliers.filter((s) => s.isActive)
  const preferredSuppliers = suppliers.filter((s) => s.isPreferred)

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Proveedores</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra tus proveedores y contactos
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <SupplierExportButton storeId={context.storeId} />
          <SupplierImportButton storeId={context.storeId} />
          <Button asChild className="flex-1 sm:flex-initial">
            <Link href={`/dashboard/${storeSlug}/suppliers/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Proveedor
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <CardDescription>Total Proveedores</CardDescription>
            <CardTitle className="text-3xl">{suppliers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <CardDescription>Proveedores Activos</CardDescription>
            <CardTitle className="text-3xl">{activeSuppliers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader className="pb-3">
            <CardDescription>Proveedores Preferidos</CardDescription>
            <CardTitle className="text-3xl">{preferredSuppliers.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {suppliers.length === 0 ? (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Truck className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aún no hay proveedores</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Comienza agregando tu primer proveedor
            </p>
            <Button asChild>
              <Link href={`/dashboard/${storeSlug}/suppliers/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Proveedor
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card style={{ borderColor: 'var(--color-primary)' }}>
          <CardHeader>
            <CardTitle>Todos los Proveedores ({suppliers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 sm:px-4">Nombre</th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden md:table-cell">Contacto Principal</th>
                    <th className="text-left py-3 px-2 sm:px-4 hidden lg:table-cell">Ciudad</th>
                    <th className="text-center py-3 px-2 sm:px-4 hidden sm:table-cell">Estado</th>
                    <th className="text-right py-3 px-2 sm:px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => {
                    const primaryContact = supplier.contacts?.find((c: any) => c.isPrimary)

                    return (
                      <tr key={supplier.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-sm sm:text-base">{supplier.name}</p>
                              {supplier.isPreferred && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Preferido
                                </Badge>
                              )}
                              {primaryContact && (
                                <p className="text-xs text-gray-500 md:hidden mt-1">
                                  {primaryContact.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                          {primaryContact ? (
                            <div>
                              <p className="text-sm font-medium">{primaryContact.name}</p>
                              {primaryContact.email && (
                                <p className="text-xs text-gray-500">{primaryContact.email}</p>
                              )}
                              {primaryContact.phone && (
                                <p className="text-xs text-gray-500">{primaryContact.phone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Sin contacto</span>
                          )}
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                          {supplier.city ? (
                            <span className="text-sm">{supplier.city}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-center hidden sm:table-cell">
                          <Badge
                            variant={supplier.isActive ? 'default' : 'secondary'}
                          >
                            {supplier.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-right">
                          <Button asChild variant="ghost" size="sm" className="h-8 px-2 sm:px-3">
                            <Link href={`/dashboard/${storeSlug}/suppliers/${supplier.id}`}>
                              <span className="hidden sm:inline">Ver</span>
                              <span className="sm:hidden">•••</span>
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
