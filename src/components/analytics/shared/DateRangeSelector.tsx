'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'


import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react'

interface DateRangeSelectorProps {
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
}

export function DateRangeSelector({ startDate, endDate, onDateChange }: DateRangeSelectorProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)
  const [activePreset, setActivePreset] = useState<number | string | null>(null)
  const [showCustom, setShowCustom] = useState(false)

  const applyDateRange = () => {
    if (localEndDate >= localStartDate) {
      onDateChange(localStartDate, localEndDate)
      setActivePreset('custom')
    }
  }

  const setPreset = (preset: number | null) => {
    const end = new Date()
    const start = new Date()

    if (preset === null) {
      start.setDate(1)
    } else if (preset === -1) {
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      end.setDate(0)
    } else if (preset === 365) {
      start.setMonth(0)
      start.setDate(1)
    } else {
      start.setDate(start.getDate() - preset)
    }

    const newStartDate = start.toISOString().split('T')[0]
    const newEndDate = end.toISOString().split('T')[0]

    setLocalStartDate(newStartDate)
    setLocalEndDate(newEndDate)
    setActivePreset(preset)
    onDateChange(newStartDate, newEndDate)
    setShowCustom(false)
  }

  useEffect(() => {
    setLocalStartDate(startDate)
    setLocalEndDate(endDate)
  }, [startDate, endDate])

  const presets = [
    { label: 'Hoy', value: 0 },
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: 'Mes', value: null },
    { label: 'Año', value: 365 },
  ]

  return (
    <div className="flex flex-col items-center justify-center w-full py-6 space-y-6">
      <div className={cn(
        "relative flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl border transition-all duration-500",
        "bg-white/80 dark:bg-black/60 backdrop-blur-xl shadow-2xl",
        "border-border/50 hover:border-primary/30",
        "after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_30px_-10px_var(--color-primary)] after:opacity-40 after:transition-opacity hover:after:opacity-70"
      )}>
        {presets.map((preset) => (
          <button
            key={String(preset.value)}
            onClick={() => setPreset(preset.value as number | null)}
            className={cn(
              "relative z-10 px-6 py-2.5 rounded-xl text-xs font-black tracking-[0.1em] uppercase transition-all duration-300",
              activePreset === preset.value
                ? "gradient-bg text-slate-950 shadow-lg shadow-primary/40 scale-[1.05] ring-1 ring-black/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80 dark:hover:bg-white/10"
            )}
          >
            {preset.label}
          </button>
        ))}

        <div className="w-px h-8 bg-border/40 mx-2 hidden sm:block" />

        <button
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            "relative z-10 px-6 py-2.5 rounded-xl text-xs font-black tracking-[0.1em] uppercase flex items-center gap-2 transition-all duration-300",
            showCustom || activePreset === 'custom'
              ? "bg-primary text-slate-950 shadow-xl shadow-primary/30 scale-[1.05] ring-1 ring-black/10"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80 dark:hover:bg-white/10"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>Personalizado</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform duration-500", showCustom ? "rotate-180" : "")} />
        </button>
      </div>

      {showCustom && (
        <Card className={cn(
          "relative max-w-xl w-full border border-border/50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]",
          "bg-white/95 dark:bg-zinc-950/90 backdrop-blur-2xl animate-in zoom-in-95 fade-in duration-300 rounded-3xl overflow-hidden"
        )}>
          <div className="absolute top-0 left-0 w-full h-1 gradient-bg opacity-70" />
          <CardContent className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Fecha de inicio
                </label>
                <Input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  className="rounded-2xl border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 focus:ring-primary/20 h-12 font-bold px-4"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Fecha de fin
                </label>
                <Input
                  type="date"
                  value={localEndDate}
                  onChange={(e) => setLocalEndDate(e.target.value)}
                  className="rounded-2xl border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 focus:ring-primary/20 h-12 font-bold px-4"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between pt-6 border-t border-border/40">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Estado del Rango</span>
                <p className="text-xs font-black">
                  {localEndDate < localStartDate ? (
                    <span className="text-destructive animate-pulse">Fecha inválida</span>
                  ) : (
                    <span className="text-emerald-500 flex items-center gap-1.5">
                      <Check className="h-3 w-3" /> Rango válido
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowCustom(false)}
                  className="rounded-2xl font-bold px-6 hover:bg-secondary/50 transition-colors"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={applyDateRange}
                  disabled={localEndDate < localStartDate}
                  className="rounded-2xl px-8 font-black gradient-bg shadow-xl shadow-primary/20 active:scale-95 transition-all text-white"
                >
                  Confirmar Rango
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}



