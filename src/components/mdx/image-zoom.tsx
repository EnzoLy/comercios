'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ZoomIn } from 'lucide-react'

interface ImageZoomProps {
  src: string
  alt: string
  caption?: string
}

export function ImageZoom({ src, alt, caption }: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="my-6">
        <div
          className="relative overflow-hidden rounded-2xl border border-border shadow-lg cursor-pointer group"
          onClick={() => setIsOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen(true)
            }
          }}
        >
          <img
            src={src}
            alt={alt}
            className="w-full transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/90 dark:bg-black/90 rounded-full p-3 shadow-xl">
              <ZoomIn className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        {caption && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {caption}
          </p>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-7xl w-full p-0 overflow-hidden">
          <div className="relative w-full">
            <img
              src={src}
              alt={alt}
              className="w-full h-auto"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
