import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('qf_token')?.value

  // Auth pages — redirect to dashboard if already logged in
  if (pathname.startsWith('/auth')) {
    if (token) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Protected routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/portal')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*', '/auth/:path*'],
}
