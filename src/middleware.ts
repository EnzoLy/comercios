import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'

// Force Node.js runtime for middleware (required for TypeORM)
export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    let session = null
    try {
      session = await auth()
    } catch (error) {
      console.error('Auth error in middleware:', error)
    }

    const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error', '/auth/change-password', '/']
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

    if (session?.user?.mustChangePassword && pathname !== '/auth/change-password' && !pathname.startsWith('/api/auth/change-password')) {
      if (pathname.startsWith('/dashboard') || pathname === '/dashboard' || pathname.startsWith('/api/stores/')) {
        return NextResponse.redirect(new URL('/auth/change-password', request.url))
      }
    }

    if (pathname.startsWith('/api/stores/')) {
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const storeIdMatch = pathname.match(/^\/api\/stores\/([^/]+)/)
      if (storeIdMatch) {
        const storeId = storeIdMatch[1]

        const store = session.user.stores.find((s) => s.storeId === storeId)
        if (!store) {
          return NextResponse.json({ error: 'Access denied to this store' }, { status: 403 })
        }

        if (session.user.role !== 'SUPER_ADMIN') {
          const { SubscriptionService } = await import('@/lib/services/subscription.service')
          const accessCheck = await SubscriptionService.checkStoreAccess(storeId)

          if (!accessCheck.hasAccess) {
            return NextResponse.json({
              error: accessCheck.reason || 'Access denied',
              subscriptionExpired: true
            }, { status: 403 })
          }
        }

        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-store-id', store.storeId)
        requestHeaders.set('x-store-slug', store.slug)
        requestHeaders.set('x-user-id', session.user.id)
        requestHeaders.set('x-employment-role', store.employmentRole)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }
    }

    if (pathname.startsWith('/dashboard')) {
      if (!session?.user) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }

      const storeSlugMatch = pathname.match(/^\/dashboard\/([^/]+)/)
      const excludedRoutes = ['select-store', 'user-settings']

      if (storeSlugMatch && !excludedRoutes.includes(storeSlugMatch[1])) {
        const storeSlug = storeSlugMatch[1]

        const hasAccess = session.user.stores.some(
          (store) => store.slug === storeSlug
        )

        if (!hasAccess) {
          return NextResponse.redirect(new URL('/dashboard/select-store', request.url))
        }

        const store = session.user.stores.find((s) => s.slug === storeSlug)
        if (store) {
          if (
            session.user.role !== 'SUPER_ADMIN' &&
            !pathname.includes('/subscription-expired')
          ) {
            const { SubscriptionService } = await import('@/lib/services/subscription.service')
            const accessCheck = await SubscriptionService.checkStoreAccess(store.storeId)

            if (!accessCheck.hasAccess) {
              const expiredUrl = new URL(`/dashboard/${storeSlug}/subscription-expired`, request.url)
              expiredUrl.searchParams.set('storeId', store.storeId)
              return NextResponse.redirect(expiredUrl)
            }
          }

          const role = store.employmentRole || ''
          const isOwner = store.isOwner

          const pageMatch = pathname.match(
            new RegExp(`^/dashboard/${storeSlug}/([^/]+)`)
          )
          const page = pageMatch ? pageMatch[1] : ''

          const plan = store.subscriptionPlan || 'FREE'

          const restrictedByPlan: Record<string, string[]> = {
            'FREE': ['products', 'categories', 'inventory', 'employees', 'shifts', 'suppliers', 'purchase-orders', 'analytics', 'sales', 'reports'],
            'BASICO': ['suppliers', 'purchase-orders', 'analytics', 'reports'],
          }

          const restrictedPages = restrictedByPlan[plan] || []
          if (page && restrictedPages.includes(page)) {
            return NextResponse.redirect(new URL(`/dashboard/${storeSlug}`, request.url))
          }

          const allowedRoutes: Record<string, string[]> = {
            CASHIER: ['pos', 'my-access', 'tutoriales'],
            STOCK_KEEPER: ['pos', 'inventory', 'my-access', 'products', 'categories', 'tutoriales'],
            MANAGER: [
              'pos',
              'employees',
              'shifts',
              'analytics',
              'sales',
              'reports',
              'my-access',
              'products',
              'categories',
              'inventory',
              'suppliers',
              'purchase-orders',
              'tutoriales',
            ],
            ADMIN: [
              'pos',
              'employees',
              'shifts',
              'analytics',
              'sales',
              'reports',
              'products',
              'categories',
              'inventory',
              'my-access',
              'suppliers',
              'purchase-orders',
              'tutoriales',
            ],
          }

          const isAdmin = role === 'ADMIN'
          if (isOwner) {
          } else if (isAdmin) {
            if (page === 'settings') {
              return NextResponse.redirect(new URL(`/dashboard/${storeSlug}`, request.url))
            }
          } else {
            const allowedPagesForRole = allowedRoutes[role] || ['pos', 'my-access']

            if (page && !allowedPagesForRole.includes(page)) {
              return NextResponse.redirect(new URL(`/dashboard/${storeSlug}`, request.url))
            }
          }

          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('x-store-id', store.storeId)
          requestHeaders.set('x-store-slug', store.slug)
          requestHeaders.set('x-user-id', session.user.id)
          requestHeaders.set('x-employment-role', store.employmentRole)

          return NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
        }
      }

      if (pathname === '/dashboard') {
        if (session.user.stores.length === 1) {
          return NextResponse.redirect(
            new URL(`/dashboard/${session.user.stores[0].slug}`, request.url)
          )
        } else if (session.user.stores.length > 1) {
          return NextResponse.redirect(
            new URL('/dashboard/select-store', request.url)
          )
        } else {
          return NextResponse.redirect(
            new URL('/dashboard/select-store', request.url)
          )
        }
      }
    }

    if (pathname.startsWith('/admin')) {
      if (!session || session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
    }

    if (pathname.startsWith('/api/admin')) {
      if (!session || session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Super admin access required' },
          { status: 403 }
        )
      }
    }

    if (isPublicRoute && session?.user && pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    console.error('Pathname:', request.nextUrl.pathname)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/stores/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
