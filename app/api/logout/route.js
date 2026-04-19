import { NextResponse } from 'next/server'

export async function GET(request) {
  const url = new URL('/login', request.url)
  const response = NextResponse.redirect(url)
  response.cookies.set('bl_auth', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
