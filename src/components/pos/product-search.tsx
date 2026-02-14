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

        const data = await response.json()
        const products = data.products || data // Support both {products: []} and [] response formats
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
          className="border-none bg-transparent h-14 text-lg focus-visible:ring-0 placeholder:text-muted-foreground/50 font-medium"
        />
        {isLoading && (
          <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
        )}
        {!isLoading && searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('')
              setSuggestions([])
              setIsOpen(false)
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-4 bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="p-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 border-b border-border/50">
            {suggestions.length} resultado{suggestions.length !== 1 ? 's' : ''}
          </div>
          <div className="max-h-[400px] overflow-auto custom-scrollbar">
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
                  className={`p-4 cursor-pointer border-b border-border/50 last:border-0 transition-all ${isSelected
                    ? 'bg-primary/5 pl-6'
                    : 'hover:bg-primary/5 hover:pl-6'
                    } ${!inStock ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    {product.imageUrl ? (
                      <div className="relative h-14 w-14 flex-shrink-0">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover rounded-xl shadow-sm"
                        />
                        {!inStock && (
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                            <Box className="h-5 w-5 text-destructive" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-14 w-14 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-tighter">SKU: {product.sku}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-lg gradient-text leading-none">{price}</p>
                          <div className={`text-[10px] font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded-full inline-block ${inStock ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                            {inStock ? `Stock: ${stock}` : 'Agotado'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isOpen && debouncedSearchTerm && suggestions.length === 0 && !isLoading && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-4 bg-card border border-border rounded-3xl shadow-2xl p-12 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Box className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">No hay coincidencias</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
              No pudimos encontrar productos que coincidan con "{debouncedSearchTerm}"
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
