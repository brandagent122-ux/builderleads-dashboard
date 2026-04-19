import { NextResponse } from 'next/server'

export function middleware(request) {
  const cookie = request.cookies.get('bl_auth')
  
  if (cookie?.value === 'authorized') {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname === '/api/login') {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/login).*)'],
}
