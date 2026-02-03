import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error', '/auth/change-password', '/']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // If user must change password, dynamic redirect to change password page
  if (session?.user?.mustChangePassword && pathname !== '/auth/change-password' && !pathname.startsWith('/api/auth/change-password')) {
    // Only redirect if they are not already going there or calling the change password API
    if (pathname.startsWith('/dashboard') || pathname === '/dashboard' || pathname.startsWith('/api/stores/')) {
      return NextResponse.redirect(new URL('/auth/change-password', request.url))
    }
  }

  // Handle API routes with store ID in path
  if (pathname.startsWith('/api/stores/')) {
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract storeId from path: /api/stores/[storeId]/...
    const storeIdMatch = pathname.match(/^\/api\/stores\/([^/]+)/)
    if (storeIdMatch) {
      const storeId = storeIdMatch[1]

      // Verify user has access to this store
      const store = session.user.stores.find((s) => s.storeId === storeId)
      if (!store) {
        return NextResponse.json({ error: 'Access denied to this store' }, { status: 403 })
      }

      // Attach store and user info to request headers (for future use)
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

  // If accessing dashboard routes, require authentication
  if (pathname.startsWith('/dashboard')) {
    if (!session?.user) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Check if accessing store-scoped route: /dashboard/[storeSlug]/*
    const storeSlugMatch = pathname.match(/^\/dashboard\/([^/]+)/)
    if (storeSlugMatch && storeSlugMatch[1] !== 'select-store') {
      const storeSlug = storeSlugMatch[1]

      // Verify user has access to this store
      const hasAccess = session.user.stores.some(
        (store) => store.slug === storeSlug
      )

      if (!hasAccess) {
        // User doesn't have access to this store
        return NextResponse.redirect(new URL('/dashboard/select-store', request.url))
      }

      // Find the storeId for this slug
      const store = session.user.stores.find((s) => s.slug === storeSlug)
      if (store) {
        // Check role-based access for admin routes
        const adminRoutes = [
          '/employees',
          '/products',
          '/categories',
          '/inventory',
          '/analytics',
          '/sales',
          '/reports',
          '/settings',
          '/shifts',
        ]

        const managementRoutes = [
          '/products',
          '/categories',
          '/inventory',
          '/analytics',
          '/sales',
          '/reports',
          '/shifts',
        ]

        const ownerOnlyRoutes = ['/settings']

        const isAccessingAdminRoute = adminRoutes.some((route) =>
          pathname.includes(route)
        )

        const isAccessingManagementRoute = managementRoutes.some((route) =>
          pathname.includes(route)
        )

        const isAccessingOwnerRoute = ownerOnlyRoutes.some((route) =>
          pathname.includes(route)
        )

        // CASHIER and STOCK_KEEPER can access: dashboard, pos
        // MANAGER can access: dashboard, pos, employees, shifts, analytics, sales, reports
        // ADMIN can access: dashboard, pos, employees, shifts, analytics, sales, reports, products, categories, inventory
        // OWNER can access: everything

        const role = store.employmentRole || ''
        const isOwner = store.isOwner

        if (isAccessingOwnerRoute && !isOwner) {
          // Only owners can access settings
          return NextResponse.redirect(new URL(`/dashboard/${storeSlug}`, request.url))
        }

        if (isAccessingManagementRoute && role === 'CASHIER' && !isOwner) {
          // CASHIER cannot access management routes
          return NextResponse.redirect(new URL(`/dashboard/${storeSlug}`, request.url))
        }

        if (isAccessingAdminRoute && role === 'STOCK_KEEPER' && !isOwner) {
          // STOCK_KEEPER has limited access
          return NextResponse.redirect(new URL(`/dashboard/${storeSlug}`, request.url))
        }

        // Attach storeId to request headers for API routes
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

    // If accessing /dashboard without store, redirect to store selector if has stores
    if (pathname === '/dashboard') {
      if (session.user.stores.length === 1) {
        // Only one store, redirect directly to it
        return NextResponse.redirect(
          new URL(`/dashboard/${session.user.stores[0].slug}`, request.url)
        )
      } else if (session.user.stores.length > 1) {
        // Multiple stores, let user choose
        return NextResponse.redirect(
          new URL('/dashboard/select-store', request.url)
        )
      } else {
        // No stores yet, redirect to create store
        return NextResponse.redirect(
          new URL('/dashboard/select-store', request.url)
        )
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (isPublicRoute && session?.user && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/stores/:path*',
  ],
}
