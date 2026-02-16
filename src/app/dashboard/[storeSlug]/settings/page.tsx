'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useStore } from '@/hooks/use-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Percent, Cog, Shield, Trash2 } from 'lucide-react'
import { TaxSettingsForm } from '@/components/settings/tax-settings-form'
import { SecuritySettingsForm } from '@/components/settings/security-settings-form'
import { ResetSettingsForm } from '@/components/settings/reset-settings-form'
import { StoreInfoForm } from '@/components/settings/store-info-form'

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
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="taxes" className="gap-2">
            <Percent className="h-4 w-4" />
            Impuestos
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Cog className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="reset" className="gap-2 text-red-600 data-[state=active]:text-red-600">
            <Trash2 className="h-4 w-4" />
            Reset
          </TabsTrigger>
        </TabsList>

        {/* Tab de Impuestos */}
        <TabsContent value="taxes" className="space-y-6 mt-6">
          <TaxSettingsForm />
        </TabsContent>

        {/* Tab de Seguridad */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <SecuritySettingsForm />
        </TabsContent>

        {/* Tab de Configuración General */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <StoreInfoForm />

          <Card>
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
              <CardDescription>
                Datos de la tienda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID de Tienda</p>
                <p className="text-xs font-mono text-muted-foreground">{store.storeId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tu Rol</p>
                <p className="text-lg font-semibold capitalize">{store.role}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Reset */}
        <TabsContent value="reset" className="space-y-6 mt-6">
          <ResetSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
