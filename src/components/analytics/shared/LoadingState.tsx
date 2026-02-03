'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface LoadingStateProps {
  type?: 'card' | 'chart' | 'table'
  count?: number
}

export function LoadingState({ type = 'card', count = 1 }: LoadingStateProps) {
  if (type === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className="w-full h-[300px] space-y-4 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="w-full h-[250px]" />
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  return null
}
