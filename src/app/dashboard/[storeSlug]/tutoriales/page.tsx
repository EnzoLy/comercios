import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { BookOpen, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getAllTutorials, getTutorialsForRole, getFeaturedTutorials } from '@/lib/mdx/get-tutorials'
import { TutorialCategoryTabs } from '@/components/tutorials/tutorial-category-tabs'
import { TutorialGrid } from '@/components/tutorials/tutorial-grid'
import { EmploymentRole } from '@/lib/db/entities/employment.entity'

interface PageProps {
  params: Promise<{ storeSlug: string }>
}

export const metadata = {
  title: 'Tutoriales | Commerce Management System',
  description: 'Aprende a usar todas las funcionalidades del sistema'
}

// Force dynamic rendering since we use auth()
export const dynamic = 'force-dynamic'

export default async function TutorialesPage({ params }: PageProps) {
  const { storeSlug } = await params

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

  // Obtener tutoriales filtrados por rol
  const allTutorials = getTutorialsForRole(role, isOwner)
  const featuredTutorials = getFeaturedTutorials().filter(tutorial => {
    // Aplicar el mismo filtro de roles a los destacados
    if (!tutorial.frontmatter.roles || tutorial.frontmatter.roles.length === 0) {
      return true
    }
    if (isOwner) return true
    return tutorial.frontmatter.roles.includes(role as EmploymentRole)
  })

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Tutoriales</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Aprende a usar todas las funcionalidades del sistema con nuestras guías paso a paso
        </p>
      </div>

      {/* Tutoriales destacados */}
      {featuredTutorials.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary fill-primary" />
              Tutoriales Destacados
            </CardTitle>
            <CardDescription>
              Los tutoriales más importantes para comenzar a usar el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TutorialGrid tutorials={featuredTutorials} storeSlug={storeSlug} />
          </CardContent>
        </Card>
      )}

      {/* Todos los tutoriales con tabs por categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Todos los Tutoriales</CardTitle>
          <CardDescription>
            Explora tutoriales organizados por categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TutorialCategoryTabs tutorials={allTutorials} storeSlug={storeSlug} />
        </CardContent>
      </Card>
    </div>
  )
}
