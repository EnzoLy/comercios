'use client'

import { useTheme } from '@/contexts/theme-context'
import { AVAILABLE_THEMES } from '@/lib/themes'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Palette } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ThemeSelectorProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemeSelector({ isOpen, onOpenChange }: ThemeSelectorProps) {
  const { currentTheme, setTheme, isLoading } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(currentTheme.id)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (selectedTheme === currentTheme.id) {
      onOpenChange(false)
      return
    }

    setIsSaving(true)
    try {
      await setTheme(selectedTheme)
      toast.success('Tema actualizado correctamente')
      onOpenChange(false)
    } catch (error) {
      toast.error('Error al guardar el tema')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Seleccionar Tema de Color
          </DialogTitle>
          <DialogDescription>
            Elige tu combinación de colores favorita. Los cambios se guardarán automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
          {Object.entries(AVAILABLE_THEMES).map(([themeId, theme]) => (
            <button
              key={themeId}
              onClick={() => setSelectedTheme(themeId)}
              className={`relative group transition-all ${
                selectedTheme === themeId ? 'ring-2 ring-offset-2 ring-gray-400' : ''
              }`}
            >
              {/* Color preview box */}
              <div className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="h-full grid grid-cols-3">
                  <div style={{ backgroundColor: theme.colors.primary }} />
                  <div style={{ backgroundColor: theme.colors.secondary }} />
                  <div style={{ backgroundColor: theme.colors.accent }} />
                </div>
              </div>

              {/* Label */}
              <p className="mt-2 text-sm font-medium text-center text-gray-700 dark:text-gray-300">
                {theme.label}
              </p>

              {/* Checkmark */}
              {selectedTheme === themeId && (
                <div className="absolute top-2 right-2 bg-gray-800 dark:bg-white text-white dark:text-gray-800 rounded-full p-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="space-y-4 pt-4 border-t">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Vista previa:
          </p>
          <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
            <div className="space-y-3">
              <h3
                className="text-lg font-bold"
                style={{ color: AVAILABLE_THEMES[selectedTheme].colors.primary }}
              >
                Título Ejemplo
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Este es un texto de ejemplo para mostrar cómo se vería el tema seleccionado.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  className="px-3 py-1 rounded text-sm font-medium text-white transition-all"
                  style={{
                    backgroundColor: AVAILABLE_THEMES[selectedTheme].colors.primary,
                  }}
                >
                  Botón Principal
                </button>
                <button
                  className="px-3 py-1 rounded text-sm font-medium transition-all border"
                  style={{
                    borderColor: AVAILABLE_THEMES[selectedTheme].colors.primary,
                    color: AVAILABLE_THEMES[selectedTheme].colors.primary,
                  }}
                >
                  Botón Secundario
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedTheme === currentTheme.id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Guardando...' : 'Aplicar Tema'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
