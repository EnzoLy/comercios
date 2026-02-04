'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SupplierSummary } from './supplier-summary'
import { SupplierProducts } from './supplier-products'
import { SupplierPriceHistory } from './supplier-price-history'
import { SupplierDocuments } from './supplier-documents'
import { SupplierContacts } from './supplier-contacts'
import { SupplierDeliverySchedule } from './supplier-delivery-schedule'
import { SupplierCommercialTerms } from './supplier-commercial-terms'
import type { Supplier } from '@/lib/db/entities/supplier.entity'
import type { SupplierCommercialTerms as CommercialTermsEntity } from '@/lib/db/entities/supplier-commercial-terms.entity'

interface SupplierTabsProps {
  supplier: Supplier & {
    contacts?: any[]
    supplierProducts?: any[]
    documents?: any[]
    deliverySchedules?: any[]
  }
  commercialTerms: CommercialTermsEntity | null
  storeId: string
  storeSlug: string
}

export function SupplierTabs({ supplier, commercialTerms, storeId, storeSlug }: SupplierTabsProps) {
  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="summary">Resumen</TabsTrigger>
        <TabsTrigger value="products">
          Productos ({supplier.supplierProducts?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="price-history">Historial de Precios</TabsTrigger>
        <TabsTrigger value="documents">
          Documentos ({supplier.documents?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="contacts">
          Contactos ({supplier.contacts?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="schedule">Horario</TabsTrigger>
        <TabsTrigger value="terms">Términos Comerciales</TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="summary">
          <SupplierSummary
            supplier={supplier}
            commercialTerms={commercialTerms}
            storeId={storeId}
            storeSlug={storeSlug}
          />
        </TabsContent>

        <TabsContent value="products">
          <SupplierProducts
            supplierId={supplier.id}
            initialProducts={supplier.supplierProducts || []}
            storeId={storeId}
            storeSlug={storeSlug}
          />
        </TabsContent>

        <TabsContent value="price-history">
          <SupplierPriceHistory
            supplierId={supplier.id}
            storeId={storeId}
          />
        </TabsContent>

        <TabsContent value="documents">
          <SupplierDocuments
            supplierId={supplier.id}
            initialDocuments={supplier.documents || []}
            storeId={storeId}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <SupplierContacts
            supplierId={supplier.id}
            initialContacts={supplier.contacts || []}
            storeId={storeId}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <SupplierDeliverySchedule
            supplierId={supplier.id}
            initialSchedules={supplier.deliverySchedules || []}
            storeId={storeId}
          />
        </TabsContent>

        <TabsContent value="terms">
          <SupplierCommercialTerms
            supplierId={supplier.id}
            initialTerms={commercialTerms}
            storeId={storeId}
          />
        </TabsContent>
      </div>
    </Tabs>
  )
}
