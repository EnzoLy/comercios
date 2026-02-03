'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Heart, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'

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
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    fetchFavorites()
  }, [storeId])

  const fetchFavorites = async () => {
    setIsLoading(true)
    try {
      const activeUserId = localStorage.getItem('activeUserId')
      const queryParam = activeUserId ? `?activeUserId=${activeUserId}` : ''

      const response = await fetch(`/api/stores/${storeId}/pos/favorites${queryParam}`)
      if (response.ok) {
        const data = await response.json()
        setFavorites(data)
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
      toast.error('Error al cargar los favoritos')
    } finally {
      setIsLoading(false)
    }
  }

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
    <Card className="mb-4">
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
            <div className="space-y-2">
              {favorites.map((favorite) => (
                <Button
                  key={favorite.productId}
                  variant="outline"
                  className="w-full h-auto flex-col items-start justify-start p-3 text-left"
                  onClick={() => handleAddToCart(favorite)}
                  disabled={favorite.currentStock === 0}
                >
                  <div className="w-full flex items-center gap-3">
                    {favorite.imageUrl ? (
                      <img
                        src={favorite.imageUrl}
                        alt={favorite.name}
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {favorite.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {favorite.sku}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sm">
                          {formatCurrency(favorite.price)}
                        </p>
                        <p
                          className={`text-xs ${
                            favorite.currentStock > 0
                              ? 'text-green-600'
                              : 'text-red-500'
                          }`}
                        >
                          {favorite.currentStock > 0
                            ? `Stock: ${favorite.currentStock}`
                            : 'Agotado'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3"
            onClick={fetchFavorites}
            disabled={isLoading}
          >
            Actualizar
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
