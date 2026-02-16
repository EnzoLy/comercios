import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import { Tutorial, TutorialCategory, TutorialFrontmatter } from './tutorial-types'
import { EmploymentRole } from '../db/entities/employment.entity'

const tutorialsDirectory = path.join(process.cwd(), 'src', 'content', 'tutoriales')

/**
 * Obtiene todos los tutoriales disponibles
 */
export function getAllTutorials(): Tutorial[] {
  const tutorials: Tutorial[] = []

  // Función recursiva para leer archivos MDX
  function readDirectory(dir: string, basePath: string = ''): void {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // Si es directorio, recursivamente leerlo
        readDirectory(fullPath, path.join(basePath, file))
      } else if (file.endsWith('.mdx')) {
        // Si es archivo MDX, procesarlo
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)
        const stats = readingTime(content)

        // Calcular slug relativo
        const slug = path.join(basePath, file.replace(/\.mdx$/, '')).replace(/\\/g, '/')

        tutorials.push({
          slug,
          frontmatter: data as TutorialFrontmatter,
          content,
          readingTime: stats
        })
      }
    }
  }

  // Verificar si el directorio existe
  if (fs.existsSync(tutorialsDirectory)) {
    readDirectory(tutorialsDirectory)
  }

  // Ordenar por categoría y luego por order
  tutorials.sort((a, b) => {
    if (a.frontmatter.category !== b.frontmatter.category) {
      return a.frontmatter.category.localeCompare(b.frontmatter.category)
    }
    return a.frontmatter.order - b.frontmatter.order
  })

  return tutorials
}

/**
 * Obtiene un tutorial por su slug
 */
export function getTutorialBySlug(slug: string): Tutorial | null {
  const tutorials = getAllTutorials()
  return tutorials.find(t => t.slug === slug) || null
}

/**
 * Obtiene tutoriales filtrados por rol del usuario
 * NOTA: Todos los usuarios pueden acceder a todos los tutoriales
 */
export function getTutorialsForRole(role: EmploymentRole | string, isOwner: boolean = false): Tutorial[] {
  const allTutorials = getAllTutorials()

  // Permitir acceso a todos los tutoriales sin importar el rol
  return allTutorials
}

/**
 * Obtiene tutoriales por categoría
 */
export function getTutorialsByCategory(category: TutorialCategory): Tutorial[] {
  const allTutorials = getAllTutorials()
  return allTutorials.filter(t => t.frontmatter.category === category)
}

/**
 * Obtiene tutoriales destacados
 */
export function getFeaturedTutorials(): Tutorial[] {
  const allTutorials = getAllTutorials()
  return allTutorials.filter(t => t.frontmatter.featured === true)
}

/**
 * Obtiene tutoriales relacionados basándose en slugs
 */
export function getRelatedTutorials(slugs: string[]): Tutorial[] {
  const allTutorials = getAllTutorials()
  return allTutorials.filter(t => slugs.includes(t.slug))
}

/**
 * Obtiene el tutorial anterior y siguiente en la misma categoría
 */
export function getAdjacentTutorials(
  currentSlug: string,
  category: TutorialCategory
): {
  previous: Tutorial | null
  next: Tutorial | null
} {
  const categoryTutorials = getTutorialsByCategory(category)
  const currentIndex = categoryTutorials.findIndex(t => t.slug === currentSlug)

  if (currentIndex === -1) {
    return { previous: null, next: null }
  }

  return {
    previous: currentIndex > 0 ? categoryTutorials[currentIndex - 1] : null,
    next: currentIndex < categoryTutorials.length - 1 ? categoryTutorials[currentIndex + 1] : null
  }
}

/**
 * Verifica si un usuario puede acceder a un tutorial
 * NOTA: Todos los usuarios pueden acceder a todos los tutoriales
 */
export function canAccessTutorial(
  tutorial: Tutorial,
  role: EmploymentRole | string,
  isOwner: boolean = false
): boolean {
  // Permitir acceso a todos los tutoriales sin importar el rol
  return true
}
