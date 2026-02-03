'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

interface CategoryFilterProps {
  storeId: string
  onCategorySelect: (categoryId: string | null) => void
}

export function CategoryFilter({ storeId, onCategorySelect }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      if (!storeId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/stores/${storeId}/categories`)
        if (response.ok) {
          const data = await response.json()
          setCategories(data.filter((cat: any) => cat.isActive))
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [storeId])

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId)
    onCategorySelect(categoryId)
  }

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('category-scroll-container')
    if (container) {
      const scrollAmount = 200
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  const handleScroll = () => {
    const container = document.getElementById('category-scroll-container')
    if (container) {
      setShowLeftArrow(container.scrollLeft > 0)
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      )
    }
  }

  if (isLoading) {
    return <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <div className="relative mb-4">
      <div className="flex items-center gap-2">
        {showLeftArrow && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollContainer('left')}
            className="absolute left-0 z-10 h-10 w-10 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <div
          id="category-scroll-container"
          onScroll={handleScroll}
          className={cn(
            'flex gap-2 overflow-x-auto pb-2 scroll-smooth',
            showLeftArrow && 'pl-10',
            showRightArrow && 'pr-10'
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <Button
            variant={selectedCategoryId === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategorySelect(null)}
            className="whitespace-nowrap flex-shrink-0"
          >
            Todos
          </Button>

          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategoryId === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategorySelect(category.id)}
              className="whitespace-nowrap flex-shrink-0"
            >
              {category.name}
            </Button>
          ))}
        </div>

        {showRightArrow && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollContainer('right')}
            className="absolute right-0 z-10 h-10 w-10 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <style jsx>{`
        #category-scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
