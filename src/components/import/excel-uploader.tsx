'use client'

import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExcelUploaderProps {
  onFileSelect: (file: File) => void
  isProcessing?: boolean
  accept?: string
}

export function ExcelUploader({
  onFileSelect,
  isProcessing = false,
  accept = '.xlsx,.xls,.csv',
}: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  return (
    <div className="w-full">
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          isProcessing && 'opacity-50 pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          id="excel-upload"
          disabled={isProcessing}
        />

        <label
          htmlFor="excel-upload"
          className="cursor-pointer flex flex-col items-center gap-4"
        >
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
              isDragging
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            )}
          >
            {selectedFile ? (
              <FileSpreadsheet className="w-8 h-8" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          {selectedFile ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium text-foreground">
                Arrastra tu archivo Excel aquí
              </p>
              <p className="text-sm text-muted-foreground">
                o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos: .xlsx, .xls, .csv
              </p>
            </div>
          )}
        </label>
      </div>

      {isProcessing && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Procesando archivo...
        </div>
      )}
    </div>
  )
}
