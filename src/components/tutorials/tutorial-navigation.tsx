import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getAdjacentTutorials } from '@/lib/mdx/get-tutorials'
import { TutorialCategory } from '@/lib/mdx/tutorial-types'

interface TutorialNavigationProps {
  currentSlug: string
  category: TutorialCategory
  storeSlug: string
}

export function TutorialNavigation({
  currentSlug,
  category,
  storeSlug
}: TutorialNavigationProps) {
  const { previous, next } = getAdjacentTutorials(currentSlug, category)

  if (!previous && !next) {
    return null
  }

  return (
    <div className="mt-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {previous ? (
          <Link href={`/dashboard/${storeSlug}/tutoriales/${previous.slug}`}>
            <Card className="h-full hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <ChevronLeft className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Anterior</p>
                    <p className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                      {previous.frontmatter.title}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <div />
        )}

        {next ? (
          <Link href={`/dashboard/${storeSlug}/tutoriales/${next.slug}`}>
            <Card className="h-full hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 text-right">
                    <p className="text-xs text-muted-foreground mb-1">Siguiente</p>
                    <p className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                      {next.frontmatter.title}
                    </p>
                  </div>
                  <div className="mt-1">
                    <ChevronRight className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
