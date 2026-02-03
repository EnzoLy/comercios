import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Create response with success message
    const response = NextResponse.json({ success: true })

    // Clear NextAuth session cookies
    // These are the default cookie names used by NextAuth.js v5
    response.cookies.set({
      name: 'authjs.session-token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    })

    response.cookies.set({
      name: 'authjs.csrf-token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Error during logout:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
