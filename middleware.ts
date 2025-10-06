import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-123456789'

// Middleware function
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer '

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any

      if (decoded.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        )
      }

      // Add user info to request headers for use in components
      const response = NextResponse.next()
      response.headers.set('x-user-id', decoded.userId)
      response.headers.set('x-user-email', decoded.email)
      response.headers.set('x-user-role', decoded.role)
      return response

    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ['/admin/:path*']
}