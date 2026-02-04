/**
 * Gets the base URL for the current environment
 * In production/Vercel: uses the actual domain from headers or env vars
 * In development: falls back to localhost
 */
export function getBaseUrl(request?: Request): string {
  // Check if we have a request and extract the host from headers
  if (request) {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
  }

  // Fallback to environment variables
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Development fallback
  return 'http://localhost:3000'
}
