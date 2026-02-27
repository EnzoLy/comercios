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
  isActive?: boolean
  barcode?: string
  barcodes?: { barcode: string }[]
  categoryId?: string
  itemType?: 'product'
}

interface Service {
  id: string
  name: string
  price: number | string
  description?: string
  imageUrl?: string
  isActive?: boolean
  itemType: 'service'
}

type SearchResult = Product | Service

interface ProductSearchProps {
  storeId: string
  onProductSelect: (product: Product | Service) => void
  categoryId?: string | null
  isOnline?: boolean
  cachedProducts?: Product[]
}

export function ProductSearch({ storeId, onProductSelect, categoryId, isOnline = true, cachedProducts = [] }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
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
        // Offline: filter from cached products locally
        if (!isOnline) {
          const query = debouncedSearchTerm.toLowerCase()
          let results = cachedProducts.filter(p => {
            if (!p.isActive) return false
            const matchesQuery =
              p.name.toLowerCase().includes(query) ||
              p.sku.toLowerCase().includes(query) ||
              p.barcode?.toLowerCase().includes(query) ||
              p.barcodes?.some(b => b.barcode.toLowerCase().includes(query))
            if (!matchesQuery) return false
            if (categoryId && p.categoryId !== categoryId) return false
            return true
          })
          setSuggestions(results.slice(0, 8))
          setIsOpen(true)
          setSelectedIndex(-1)
          return
        }

        // Online: search both products and services
        const params = new URLSearchParams({
          search: debouncedSearchTerm,
        })
        if (categoryId) {
          params.append('categoryId', categoryId)
        }

        // Search products
        const productsResponse = await fetch(
          `/api/stores/${storeId}/products?${params.toString()}`
        )
        const productsData = await productsResponse.json()
        const products = (productsData.products || productsData || []).map((p: any) => ({
          ...p,
          itemType: 'product' as const
        }))

        // Search services
        const servicesParams = new URLSearchParams({
          search: debouncedSearchTerm,
        })
        const servicesResponse = await fetch(
          `/api/stores/${storeId}/services?${servicesParams.toString()}`
        )
        const servicesData = await servicesResponse.json()
        const services = (servicesData.services || servicesData || []).map((s: any) => ({
          ...s,
          price: s.price,
          itemType: 'service' as const
        }))

        // Combine and limit results
        const allResults = [...products, ...services].slice(0, 8)
        setSuggestions(allResults)
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
  }, [debouncedSearchTerm, storeId, categoryId, isOnline, cachedProducts])

  const handleSelectProduct = (result: SearchResult) => {
    onProductSelect(result)
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
          className="absolute z-50 w-full md:w-[500px] lg:w-[600px] mt-4 bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="p-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 border-b border-border">
            {suggestions.length} resultado{suggestions.length !== 1 ? 's' : ''}
          </div>
          <div className="max-h-[400px] overflow-auto custom-scrollbar">
            {suggestions.map((item, index) => {
              const isSelected = index === selectedIndex
              const isService = item.itemType === 'service'
              const price = formatCurrency(isService ? (item as Service).price : (item as Product).sellingPrice)
              const stock = isService ? undefined : (item as Product).currentStock
              const inStock = isService ? true : (stock ?? 0) > 0
              const Icon = isService ? <span className="text-violet-500 text-lg">✨</span> : <Package className="h-7 w-7 text-muted-foreground/40" />

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectProduct(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-4 cursor-pointer border-b border-border last:border-0 transition-all ${isSelected
                    ? 'bg-primary/5 pl-6'
                    : 'hover:bg-primary/5 hover:pl-6'
                    } ${!inStock ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    {item.imageUrl ? (
                      <div className="relative h-14 w-14 flex-shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
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
                        {Icon}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                              {item.name}
                            </p>
                            {isService && <span className="text-xs font-bold px-2 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded-full">Servicio</span>}
                          </div>
                          {!isService && <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-tighter">SKU: {(item as Product).sku}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-lg gradient-text leading-none">{price}</p>
                          {!isService && <div className={`text-[10px] font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded-full inline-block ${inStock ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                            {inStock ? `Stock: ${stock}` : 'Agotado'}
                          </div>}
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
