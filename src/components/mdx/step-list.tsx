'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepListProps {
  children: React.ReactNode
}

interface StepProps {
  title: string
  children: React.ReactNode
}

export function StepList({ children }: StepListProps) {
  return (
    <div className="my-6 space-y-4">
      {children}
    </div>
  )
}

let stepCounter = 0

export function Step({ title, children }: StepProps) {
  // Incrementar contador para cada paso
  const stepNumber = ++stepCounter

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Línea vertical conectora */}
      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border last:hidden" />

      {/* Círculo numerado */}
      <div className="relative flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
          {stepNumber}
        </div>
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 pt-2">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <div className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
          {children}
        </div>
      </div>
    </div>
  )
}

// Reset counter cuando se monte un nuevo StepList
if (typeof window !== 'undefined') {
  stepCounter = 0
}
