import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStoreContext } from '@/lib/auth/store-context'
import { getDataSource } from '@/lib/db'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { SupplierCommercialTerms } from '@/lib/db/entities/supplier-commercial-terms.entity'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SupplierTabs } from '@/components/suppliers/supplier-tabs'
import { ArrowLeft, Star, Building2, MapPin, Globe, FileText, Plus } from 'lucide-react'

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ storeSlug: string; supplierId: string }>
}) {
  const { storeSlug, supplierId } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    return null
  }

  const dataSource = await getDataSource()
  const supplierRepo = dataSource.getRepository(Supplier)
  const termsRepo = dataSource.getRepository(SupplierCommercialTerms)

  // Fetch supplier with all relations
  const supplier = await supplierRepo.findOne({
    where: { id: supplierId, storeId: context.storeId },
    relations: [
      'contacts',
      'supplierProducts',
      'supplierProducts.product',
      'documents',
      'deliverySchedules',
    ],
  })

  if (!supplier) {
    notFound()
  }

  // Fetch commercial terms separately (OneToOne relation)
  const commercialTerms = await termsRepo.findOne({
    where: { supplierId, storeId: context.storeId },
    relations: ['volumeDiscounts'],
  })

  const primaryContact = supplier.contacts?.find((c) => c.isPrimary)

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/dashboard/${storeSlug}/suppliers`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Proveedores
          </Link>
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{supplier.name}</h1>
                <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                  {supplier.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
                {supplier.isPreferred && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    Preferido
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {supplier.rating && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < supplier.rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                          }`}
                      />
                    ))}
                    <span className="ml-1">({supplier.rating}/5)</span>
                  </div>
                )}
                {supplier.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</span>
                  </div>
                )}
                {supplier.website && (
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Sitio Web</span>
                  </a>
                )}
                {supplier.taxId && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>RFC: {supplier.taxId}</span>
                  </div>
                )}
              </div>

              {primaryContact && (
                <div className="mt-3 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">Contacto Principal:</p>
                  <p className="font-medium">{primaryContact.name}</p>
                  {primaryContact.email && (
                    <a
                      href={`mailto:${primaryContact.email}`}
                      className="text-primary hover:underline"
                    >
                      {primaryContact.email}
                    </a>
                  )}
                  {primaryContact.phone && (
                    <p className="text-gray-600 dark:text-gray-400">{primaryContact.phone}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/dashboard/${storeSlug}/purchase-orders/new?supplierId=${supplierId}`}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Orden de Compra
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/${storeSlug}/suppliers/${supplierId}/edit`}>
                Editar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <SupplierTabs
        supplier={JSON.parse(JSON.stringify(supplier))}
        commercialTerms={commercialTerms ? JSON.parse(JSON.stringify(commercialTerms)) : null}
        storeId={context.storeId}
        storeSlug={storeSlug}
      />
    </div>
  )
}
