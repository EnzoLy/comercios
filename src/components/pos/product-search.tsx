'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { Search, Loader2, Package, Box } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface Product {
  id: string
  name: string
  sku: string
  sellingPrice: number | string
  costPrice: number | string
  currentStock: number
  imageUrl?: string
}

interface ProductSearchProps {
  storeId: string
  onProductSelect: (product: Product) => void
  categoryId?: string | null
}

export function ProductSearch({ storeId, onProductSelect, categoryId }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search products when debounced term changes
  useEffect(() => {
    const searchProducts = async () => {
      if (!debouncedSearchTerm.trim()) {
        setSuggestions([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          search: debouncedSearchTerm,
        })
        if (categoryId) {
          params.append('categoryId', categoryId)
        }
        const response = await fetch(
          `/api/stores/${storeId}/products?${params.toString()}`
        )

        if (!response.ok) {
          setSuggestions([])
          return
        }

        const products = await response.json()
        setSuggestions(products.slice(0, 8)) // Limit to 8 suggestions
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Search error:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }

    searchProducts()
  }, [debouncedSearchTerm, storeId, categoryId])

  const handleSelectProduct = (product: Product) => {
    onProductSelect(product)
    setSearchTerm('')
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectProduct(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar por nombre, SKU o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          className="pr-10 h-12 md:h-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />
        )}
        {!isLoading && searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('')
              setSuggestions([])
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-96 overflow-auto"
        >
          <div className="p-2 text-xs text-gray-500 border-b">
            {suggestions.length} producto{suggestions.length !== 1 ? 's' : ''} encontrado{suggestions.length !== 1 ? 's' : ''}
          </div>
          {suggestions.map((product, index) => {
            const isSelected = index === selectedIndex
            const price = formatCurrency(product.sellingPrice)
            const stock = product.currentStock
            const inStock = stock > 0

            return (
              <div
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`p-3 cursor-pointer border-b last:border-0 transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } ${!inStock ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500 truncate">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sm">{price}</p>
                        <p className={`text-xs ${inStock ? 'text-green-600' : 'text-red-500'}`}>
                          {inStock ? `Stock: ${stock}` : 'Agotado'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isOpen && debouncedSearchTerm && suggestions.length === 0 && !isLoading && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-8"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <Box className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No se encontraron productos</p>
            <p className="text-sm text-gray-500 mt-1">
              Intenta con otro término de búsqueda
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
