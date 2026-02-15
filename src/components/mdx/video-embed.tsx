'use client'

import { Play } from 'lucide-react'

interface VideoEmbedProps {
  src: string
  caption?: string
}

export function VideoEmbed({ src, caption }: VideoEmbedProps) {
  // Detectar si es un video real o un placeholder
  const isVideo = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.ogg')

  if (isVideo) {
    return (
      <div className="my-6">
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-lg">
          <video
            controls
            className="w-full"
            preload="metadata"
            aria-label={caption || 'Video tutorial'}
          >
            <source src={src} type={`video/${src.split('.').pop()}`} />
            Tu navegador no soporta el elemento de video.
          </video>
        </div>
        {caption && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {caption}
          </p>
        )}
      </div>
    )
  }

  // Placeholder (imagen con overlay de play)
  return (
    <div className="my-6">
      <div className="relative overflow-hidden rounded-2xl border border-border shadow-lg group cursor-not-allowed">
        <img
          src={src}
          alt={caption || 'Video placeholder'}
          className="w-full"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
          <div className="bg-white/90 dark:bg-black/90 rounded-full p-6 shadow-xl">
            <Play className="h-12 w-12 text-primary" fill="currentColor" />
          </div>
        </div>
      </div>
      {caption && (
        <p className="mt-2 text-center text-sm text-muted-foreground italic">
          {caption}
        </p>
      )}
    </div>
  )
}
