import Link from 'next/link'
import { Clock, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tutorial } from '@/lib/mdx/tutorial-types'

interface TutorialCardProps {
  tutorial: Tutorial
  storeSlug: string
}

const difficultyColors = {
  principiante: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  intermedio: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  avanzado: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
}

const categoryColors = {
  comenzar: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  productos: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  caja: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  inventario: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  empleados: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  proveedores: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  reportes: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  configuracion: 'bg-slate-500/10 text-slate-700 dark:text-slate-400'
}

export function TutorialCard({ tutorial, storeSlug }: TutorialCardProps) {
  const { frontmatter, readingTime } = tutorial

  return (
    <Link href={`/dashboard/${storeSlug}/tutoriales/${tutorial.slug}`}>
      <Card className="py-0 h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 cursor-pointer group">
        {frontmatter.thumbnail && (
          <div className="relative h-48 overflow-hidden rounded-t-2xl">
            <img
              src={frontmatter.thumbnail}
              alt={frontmatter.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        )}
        <div className="py-4">
          <CardHeader>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className={categoryColors[frontmatter.category]}>
                {frontmatter.category}
              </Badge>
              <Badge variant="outline" className={difficultyColors[frontmatter.difficulty]}>
                {frontmatter.difficulty}
              </Badge>
            </div>
            <CardTitle className="text-xl group-hover:text-primary transition-colors">
              {frontmatter.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {frontmatter.description}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{frontmatter.duration} min</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{readingTime.text}</span>
              </div>
            </div>

            {frontmatter.tags && frontmatter.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {frontmatter.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </Link>
  )
}
