import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

interface TopProduct {
  name: string
  sku: string
  quantitySold: number
  revenue: number
}

interface TopProductsProps {
  products: TopProduct[]
  storeSlug?: string
}

export function TopProducts({ products, storeSlug }: TopProductsProps) {
  const content = (
    <Card className={storeSlug ? 'cursor-pointer transition-all hover:shadow-lg' : ''} style={{ borderColor: 'var(--color-primary)' }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: 'var(--color-secondary)' }} />
          <CardTitle>Productos Más Vendidos</CardTitle>
        </div>
        <CardDescription>Más vendidos en los últimos 30 días</CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aún no hay datos de ventas</p>
        ) : (
          <div className="space-y-4">
            {products.map((product, index) => (
              <div
                key={product.sku}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={index === 0 ? 'default' : 'outline'}>
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {product.quantitySold} unidades
                  </p>
                  <p className="text-xs text-gray-500">
                    ${product.revenue.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (storeSlug) {
    return (
      <Link href={`/dashboard/${storeSlug}/products`}>
        {content}
      </Link>
    )
  }

  return content
}
