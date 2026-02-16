import Link from 'next/link'
import { ChevronRight, Home, BookOpen } from 'lucide-react'
import { TUTORIAL_CATEGORIES } from '@/lib/mdx/tutorial-types'
import * as LucideIcons from 'lucide-react'

interface TutorialBreadcrumbProps {
  storeSlug: string
  category?: string
  title?: string
}

export function TutorialBreadcrumb({ storeSlug, category, title }: TutorialBreadcrumbProps) {
  const categoryInfo = category
    ? TUTORIAL_CATEGORIES.find(c => c.id === category)
    : null

  const CategoryIcon = categoryInfo
    ? ((LucideIcons as any)[categoryInfo.icon] || LucideIcons.Circle)
    : null

  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <div className="bg-muted/30 border border-border rounded-2xl p-4 shadow-sm">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {/* Home */}
          <li>
            <Link
              href={`/dashboard/${storeSlug}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-background/80 transition-all duration-200 text-muted-foreground hover:text-foreground group"
            >
              <Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Inicio</span>
            </Link>
          </li>

          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />

          {/* Tutoriales */}
          <li>
            <Link
              href={`/dashboard/${storeSlug}/tutoriales`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-background/80 transition-all duration-200 text-muted-foreground hover:text-foreground group"
            >
              <BookOpen className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Tutoriales</span>
            </Link>
          </li>

          {/* Categoría */}
          {categoryInfo && CategoryIcon && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              <li>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary">
                  <CategoryIcon className="h-4 w-4" />
                  <span className="font-medium">{categoryInfo.label}</span>
                </div>
              </li>
            </>
          )}

          {/* Título del tutorial */}
          {title && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              <li>
                <div
                  className="px-3 py-1.5 rounded-lg bg-background font-semibold text-foreground max-w-md truncate"
                  title={title}
                >
                  {title}
                </div>
              </li>
            </>
          )}
        </ol>
      </div>
    </nav>
  )
}
