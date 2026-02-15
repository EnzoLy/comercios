import { Tutorial } from '@/lib/mdx/tutorial-types'
import { TutorialCard } from './tutorial-card'
import { BookOpen } from 'lucide-react'

interface TutorialGridProps {
  tutorials: Tutorial[]
  storeSlug: string
}

export function TutorialGrid({ tutorials, storeSlug }: TutorialGridProps) {
  if (tutorials.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No hay tutoriales disponibles</h3>
        <p className="text-muted-foreground">
          No se encontraron tutoriales para esta categoría.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tutorials.map((tutorial) => (
        <TutorialCard
          key={tutorial.slug}
          tutorial={tutorial}
          storeSlug={storeSlug}
        />
      ))}
    </div>
  )
}
