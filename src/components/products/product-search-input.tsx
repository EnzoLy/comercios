'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, Loader2, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  barcode?: string
  sellingPrice: number
  currentStock: number
  imageUrl?: string
}

interface ProductSearchInputProps {
  value: string
  onChange: (productId: string) => void
  storeId: string
  disabled?: boolean
  placeholder?: string
  className?: string
  error?: string
  excludeIds?: string[]
}

export function ProductSearchInput({
  value,
  onChange,
  storeId,
  disabled,
  placeholder = 'Buscar producto...',
  className,
  error,
  excludeIds = [],
}: ProductSearchInputProps) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const selectedProduct = products.find(p => p.id === value)

  useEffect(() => {
    if (selectedProduct) {
      setSearch(selectedProduct.name)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        if (selectedProduct) {
          setSearch(selectedProduct.name)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedProduct])

  useEffect(() => {
    const updateDropdownPosition = () => {
      if (containerRef.current && showDropdown) {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const dropdownHeight = 280
        
        setDropdownStyle({
          position: 'fixed',
          top: spaceBelow >= dropdownHeight 
            ? rect.bottom + 4 
            : rect.top - dropdownHeight - 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        })
      }
    }

    updateDropdownPosition()
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)

    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true)
      window.removeEventListener('resize', updateDropdownPosition)
    }
  }, [showDropdown])

  const searchProducts = async (searchTerm: string) => {
    if (!storeId || searchTerm.length < 1) {
      setProducts([])
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('search', searchTerm)
      params.append('pageSize', '20')
      params.append('status', 'active')

      const response = await fetch(`/api/stores/${storeId}/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        const filtered = data.products.filter((p: Product) => !excludeIds.includes(p.id))
        setProducts(filtered)
      }
    } catch (error) {
      console.error('Error searching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearch(newValue)
    setHighlightedIndex(0)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (newValue.length >= 1) {
      debounceRef.current = setTimeout(() => {
        searchProducts(newValue)
        setShowDropdown(true)
      }, 300)
    } else {
      setProducts([])
      setShowDropdown(false)
    }
  }

  const handleSelectProduct = (product: Product) => {
    onChange(product.id)
    setSearch(product.name)
    setShowDropdown(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || products.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < products.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (products[highlightedIndex]) {
          handleSelectProduct(products[highlightedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        if (selectedProduct) {
          setSearch(selectedProduct.name)
        }
        break
    }
  }

  const handleFocus = () => {
    if (search.length >= 1) {
      searchProducts(search)
      setShowDropdown(true)
    }
  }

  const dropdownContent = showDropdown && products.length > 0 ? (
    <div
      style={dropdownStyle}
      className="bg-white dark:bg-gray-900 border rounded-lg shadow-xl max-h-64 overflow-y-auto"
    >
      {products.map((product, index) => (
        <div
          key={product.id}
          className={cn(
            'flex items-center gap-3 px-3 py-2 cursor-pointer',
            index === highlightedIndex
              ? 'bg-gray-100 dark:bg-gray-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
          onClick={() => handleSelectProduct(product)}
          onMouseEnter={() => setHighlightedIndex(index)}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-8 h-8 object-cover rounded"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
              <Package className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{product.name}</p>
            <p className="text-xs text-gray-500">
              SKU: {product.sku} | Stock: {product.currentStock}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              ${Number(product.sellingPrice).toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  ) : showDropdown && search.length >= 1 && !loading && products.length === 0 ? (
    <div
      style={dropdownStyle}
      className="bg-white dark:bg-gray-900 border rounded-lg shadow-xl p-4 text-center text-gray-500"
    >
      No se encontraron productos
    </div>
  ) : null

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
        <Input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={cn('pl-10', error && 'border-red-500')}
        />
      </div>

      {dropdownContent && typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
