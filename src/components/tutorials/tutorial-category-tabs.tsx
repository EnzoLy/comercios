'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tutorial, TUTORIAL_CATEGORIES } from '@/lib/mdx/tutorial-types'
import { TutorialGrid } from './tutorial-grid'
import { Badge } from '@/components/ui/badge'
import * as LucideIcons from 'lucide-react'

interface TutorialCategoryTabsProps {
  tutorials: Tutorial[]
  storeSlug: string
}

export function TutorialCategoryTabs({ tutorials, storeSlug }: TutorialCategoryTabsProps) {
  // Calcular tutoriales por categoría
  const tutorialsByCategory = TUTORIAL_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = tutorials.filter(t => t.frontmatter.category === category.id)
    return acc
  }, {} as Record<string, Tutorial[]>)

  return (
    <Tabs defaultValue="todos" className="w-full">
      {/* Navbar mejorado con scroll horizontal en móvil */}
      <div className="relative mb-8">
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <TabsList className="inline-flex h-auto gap-2 bg-transparent p-1 border-b border-border w-full min-w-max">
            <TabsTrigger
              value="todos"
              className="
                flex items-center gap-2 px-4 py-3 rounded-xl
                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted
                transition-all duration-200 font-medium
                shadow-sm data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
              "
            >
              <LucideIcons.Grid3x3 className="h-4 w-4" />
              <span>Todos</span>
              <Badge
                variant="secondary"
                className="ml-1 data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground"
              >
                {tutorials.length}
              </Badge>
            </TabsTrigger>

            {TUTORIAL_CATEGORIES.map((category) => {
              const Icon = (LucideIcons as any)[category.icon] || LucideIcons.Circle
              const count = tutorialsByCategory[category.id]?.length || 0

              if (count === 0) return null

              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="
                    flex items-center gap-2 px-4 py-3 rounded-xl
                    data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                    data-[state=inactive]:bg-muted/50 data-[state=inactive]:hover:bg-muted
                    transition-all duration-200 font-medium
                    shadow-sm data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                    whitespace-nowrap
                  "
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{category.label}</span>
                  <span className="sm:hidden">{category.label.substring(0, 3)}</span>
                  <Badge
                    variant="secondary"
                    className="ml-1 data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground"
                  >
                    {count}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Indicador de scroll en móvil */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Contenido de tabs */}
      <TabsContent value="todos" className="mt-0 focus-visible:outline-none">
        <TutorialGrid tutorials={tutorials} storeSlug={storeSlug} />
      </TabsContent>

      {TUTORIAL_CATEGORIES.map((category) => {
        const categoryTutorials = tutorialsByCategory[category.id] || []
        if (categoryTutorials.length === 0) return null

        const Icon = (LucideIcons as any)[category.icon] || LucideIcons.Circle

        return (
          <TabsContent key={category.id} value={category.id} className="mt-0 focus-visible:outline-none">
            {/* Header de categoría mejorado */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/10">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    {category.label}
                    <Badge variant="secondary" className="text-sm">
                      {categoryTutorials.length} {categoryTutorials.length === 1 ? 'tutorial' : 'tutoriales'}
                    </Badge>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>
            </div>

            <TutorialGrid tutorials={categoryTutorials} storeSlug={storeSlug} />
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
