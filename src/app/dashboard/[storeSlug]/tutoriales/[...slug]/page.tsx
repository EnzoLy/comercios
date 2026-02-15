import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { Clock, BookOpen, Calendar, User } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTutorialBySlug, canAccessTutorial, getAllTutorials } from '@/lib/mdx/get-tutorials'
import { TutorialBreadcrumb } from '@/components/tutorials/tutorial-breadcrumb'
import { TutorialNavigation } from '@/components/tutorials/tutorial-navigation'
import { mdxComponents } from '@/components/mdx/mdx-components'
import { TutorialCategory } from '@/lib/mdx/tutorial-types'

interface PageProps {
  params: Promise<{
    storeSlug: string
    slug: string[]
  }>
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

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const tutorialSlug = slug.join('/')
  const tutorial = getTutorialBySlug(tutorialSlug)

  if (!tutorial) {
    return {
      title: 'Tutorial no encontrado'
    }
  }

  return {
    title: `${tutorial.frontmatter.title} | Tutoriales`,
    description: tutorial.frontmatter.description
  }
}

export async function generateStaticParams() {
  const tutorials = getAllTutorials()

  return tutorials.map(tutorial => ({
    slug: tutorial.slug.split('/')
  }))
}

export default async function TutorialPage({ params }: PageProps) {
  const { storeSlug, slug } = await params
  const tutorialSlug = slug.join('/')

  // Verificar autenticación
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Obtener información del store
  const store = session.user.stores.find(s => s.slug === storeSlug)
  if (!store) {
    redirect('/dashboard/select-store')
  }

  const role = store.employmentRole
  const isOwner = store.isOwner || false

  // Obtener tutorial
  const tutorial = getTutorialBySlug(tutorialSlug)
  if (!tutorial) {
    notFound()
  }

  // Verificar permisos de acceso
  if (!canAccessTutorial(tutorial, role, isOwner)) {
    redirect(`/dashboard/${storeSlug}/tutoriales`)
  }

  const { frontmatter, content, readingTime } = tutorial

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <TutorialBreadcrumb
        storeSlug={storeSlug}
        category={frontmatter.category}
        title={frontmatter.title}
      />

      {/* Header Card */}
      <Card>
        <CardHeader className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={categoryColors[frontmatter.category as keyof typeof categoryColors]}>
              {frontmatter.category}
            </Badge>
            <Badge variant="outline" className={difficultyColors[frontmatter.difficulty]}>
              {frontmatter.difficulty}
            </Badge>
            {frontmatter.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Title & Description */}
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              {frontmatter.title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {frontmatter.description}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{frontmatter.duration} minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>{readingTime.text}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Actualizado:{' '}
                {new Date(frontmatter.lastUpdated).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{frontmatter.author}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Video principal (si existe) */}
      {frontmatter.videoUrl && (
        <Card>
          <CardContent className="p-6">
            <div className="relative overflow-hidden rounded-2xl">
              {frontmatter.videoUrl.endsWith('.mp4') ||
              frontmatter.videoUrl.endsWith('.webm') ? (
                <video controls className="w-full" preload="metadata">
                  <source
                    src={frontmatter.videoUrl}
                    type={`video/${frontmatter.videoUrl.split('.').pop()}`}
                  />
                  Tu navegador no soporta el elemento de video.
                </video>
              ) : (
                <img
                  src={frontmatter.videoUrl}
                  alt="Video tutorial placeholder"
                  className="w-full"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenido MDX */}
      <Card>
        <CardContent className="p-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <MDXRemote source={content} components={mdxComponents} />
          </div>
        </CardContent>
      </Card>

      {/* Navegación Anterior/Siguiente */}
      <TutorialNavigation
        currentSlug={tutorialSlug}
        category={frontmatter.category as TutorialCategory}
        storeSlug={storeSlug}
      />
    </div>
  )
}
