import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface StockAlert {
  id: string
  name: string
  sku: string
  currentStock: number
  minStockLevel: number
}

interface StockAlertsWidgetProps {
  alerts: StockAlert[]
  storeSlug: string
}

export function StockAlertsWidget({ alerts, storeSlug }: StockAlertsWidgetProps) {
  return (
    <Card style={{ borderColor: 'var(--color-primary)' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle>Alertas de Stock</CardTitle>
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length}</Badge>
          )}
        </div>
        <CardDescription>Productos que requieren reabastecimiento</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="text-muted-foreground">Todos los niveles de stock están saludables</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {alerts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      {product.currentStock} restantes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mín: {product.minStockLevel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {alerts.length > 5 && (
              <p className="text-sm text-muted-foreground text-center mb-3">
                Y {alerts.length - 5} más...
              </p>
            )}
            <Button asChild className="w-full" variant="outline">
              <Link href={`/dashboard/${storeSlug}/inventory`}>
                Ver Todas las Alertas
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
