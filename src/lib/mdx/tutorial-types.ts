import { EmploymentRole } from '../db/entities/employment.entity'

export type TutorialCategory =
  | 'comenzar'
  | 'productos'
  | 'inventario'
  | 'caja'
  | 'empleados'
  | 'proveedores'
  | 'reportes'
  | 'configuracion'

export type TutorialDifficulty = 'principiante' | 'intermedio' | 'avanzado'

export interface TutorialFrontmatter {
  title: string
  description: string
  category: TutorialCategory
  roles?: EmploymentRole[] // Roles que pueden ver este tutorial (vacío = todos)
  difficulty: TutorialDifficulty
  duration: number // Tiempo estimado en minutos
  order: number // Orden dentro de la categoría
  featured?: boolean // Mostrar en destacados
  tags: string[]
  thumbnail?: string // URL de imagen thumbnail
  videoUrl?: string // URL de video tutorial
  lastUpdated: string // Fecha ISO
  author: string
  relatedTutorials?: string[] // Slugs de tutoriales relacionados
}

export interface Tutorial {
  slug: string // Ruta relativa desde tutoriales (ej: "productos/agregar-productos")
  frontmatter: TutorialFrontmatter
  content: string // Contenido MDX sin procesar
  readingTime: {
    text: string
    minutes: number
    time: number
    words: number
  }
}

export interface CategoryInfo {
  id: TutorialCategory
  label: string
  description: string
  icon: string // Nombre del ícono de lucide-react
}

export const TUTORIAL_CATEGORIES: CategoryInfo[] = [
  {
    id: 'comenzar',
    label: 'Comenzar',
    description: 'Primeros pasos con el sistema',
    icon: 'Rocket'
  },
  {
    id: 'productos',
    label: 'Productos',
    description: 'Gestión de productos y categorías',
    icon: 'Package'
  },
  {
    id: 'caja',
    label: 'Caja',
    description: 'Punto de venta y transacciones',
    icon: 'ShoppingCart'
  },
  {
    id: 'inventario',
    label: 'Inventario',
    description: 'Control de stock y movimientos',
    icon: 'Archive'
  },
  {
    id: 'empleados',
    label: 'Empleados',
    description: 'Gestión de personal y turnos',
    icon: 'Users'
  },
  {
    id: 'proveedores',
    label: 'Proveedores',
    description: 'Administración de proveedores',
    icon: 'Truck'
  },
  {
    id: 'reportes',
    label: 'Reportes',
    description: 'Informes y análisis de datos',
    icon: 'FileText'
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    description: 'Ajustes del sistema',
    icon: 'Settings'
  }
]
