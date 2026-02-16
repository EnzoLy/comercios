'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Heart, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { useFavoriteProducts } from '@/hooks/use-favorite-products'

interface FavoriteProduct {
  productId: string
  name: string
  sku: string
  price: number
  quantitySold: number
  currentStock: number
  imageUrl?: string | null
}

interface FavoriteProductsProps {
  storeId: string
  onProductSelect: (product: any) => void
}

export function FavoriteProducts({
  storeId,
  onProductSelect,
}: FavoriteProductsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('activeUserId') : null

  // SWR hook for data fetching with caching
  const { favorites, isLoading, mutate } = useFavoriteProducts(storeId, activeUserId)

  const handleAddToCart = (favorite: FavoriteProduct) => {
    if (favorite.currentStock === 0) {
      toast.error('Producto agotado')
      return
    }

    onProductSelect({
      id: favorite.productId,
      name: favorite.name,
      sku: favorite.sku,
      sellingPrice: favorite.price,
      currentStock: favorite.currentStock,
    })
  }

  if (favorites.length === 0) {
    return null
  }

  return (
    <Card className="mb-4" style={{ borderColor: 'var(--color-primary)' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            Tus Favoritos
            <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {favorites.length}
            </span>
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {favorites.map((favorite) => (
                <button
                  key={favorite.productId}
                  className="group relative flex flex-col items-center justify-center p-4 bg-card hover:bg-primary/5 active:scale-95 border border-border/50 hover:border-primary/50 rounded-2xl transition-all shadow-sm hover:shadow-md h-full aspect-square disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  onClick={() => handleAddToCart(favorite)}
                  disabled={favorite.currentStock === 0}
                >
                  {favorite.imageUrl ? (
                    <img
                      src={favorite.imageUrl}
                      alt={favorite.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform" />
                  )}

                  <div className="relative z-10 flex flex-col items-center text-center">
                    <p className="font-bold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {favorite.name}
                    </p>
                    <p className="font-black text-lg gradient-text">
                      {formatCurrency(favorite.price)}
                    </p>
                  </div>

                  {favorite.currentStock <= 5 && favorite.currentStock > 0 && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                      {favorite.currentStock}
                    </div>
                  )}

                  {favorite.currentStock === 0 && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-destructive font-black text-xs uppercase tracking-widest rotate-12 border-2 border-destructive px-2 py-1 rounded">
                        Agotado
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            Actualizar
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
