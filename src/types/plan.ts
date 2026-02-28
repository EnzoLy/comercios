/**
 * Subscription plan types
 * Centralized definition to avoid case-sensitivity conflicts
 */

/**
 * Valid subscription plans
 * - FREE: No cost, permanent access (gated at UI level)
 * - BASICO: Basic tier with 7-day grace period
 * - PRO: Premium tier with all features
 */
export const VALID_PLANS = ['FREE', 'BASICO', 'PRO'] as const
export type Plan = (typeof VALID_PLANS)[number]

/**
 * Plan hierarchy for feature access control
 */
export const PLAN_HIERARCHY: Record<Plan, number> = {
  'FREE': 0,
  'BASICO': 1,
  'PRO': 2,
}

/**
 * Plan information and display details
 */
export interface PlanInfo {
  name: string
  label: string
  description: string
  features: string[]
}

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  'FREE': {
    name: 'free',
    label: 'Gratis',
    description: 'Plan gratuito con funcionalidades básicas',
    features: [
      'Gestión de productos',
      'Caja POS básica',
      'Hasta 1 empleado',
    ],
  },
  'BASICO': {
    name: 'basico',
    label: 'Básico',
    description: 'Plan básico con más funcionalidades',
    features: [
      'Todo del plan Gratis',
      'Múltiples empleados',
      'Inventario avanzado',
      'Servicios y citas',
    ],
  },
  'PRO': {
    name: 'pro',
    label: 'Pro',
    description: 'Plan profesional con todas las funcionalidades',
    features: [
      'Todo del plan Básico',
      'Proveedores y compras',
      'Analíticas avanzadas',
      'Reportes personalizados',
    ],
  },
}
