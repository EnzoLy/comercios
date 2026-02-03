'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Percent, Cog } from 'lucide-react'
import { TaxSettingsForm } from '@/components/settings/tax-settings-form'

export default function SettingsPage() {
  const params = useParams()
  const storeSlug = params.storeSlug as string
  const store = useStore()

  if (!store) {
    return null
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Administra la configuración general de tu tienda
        </p>
      </div>

      <Tabs defaultValue="taxes" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="taxes" className="gap-2">
            <Percent className="h-4 w-4" />
            Impuestos
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Cog className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        {/* Tab de Impuestos */}
        <TabsContent value="taxes" className="space-y-6 mt-6">
          <TaxSettingsForm />
        </TabsContent>

        {/* Tab de Configuración General */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Tienda</CardTitle>
              <CardDescription>
                Información general de tu tienda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p className="text-lg font-semibold">{store.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Slug</p>
                <p className="text-lg font-semibold">{store.slug}</p>
              </div>
              {store.email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg font-semibold">{store.email}</p>
                </div>
              )}
              {store.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                  <p className="text-lg font-semibold">{store.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
              <CardDescription>
                Estado de operación de la tienda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Activa</p>
                <p className="text-lg font-semibold">
                  {store.isActive ? '✅ Sí' : '❌ No'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
