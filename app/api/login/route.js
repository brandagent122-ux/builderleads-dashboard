import { NextResponse } from 'next/server'

export async function POST(request) {
  const { password } = await request.json()
  const correctPassword = process.env.SITE_PASSWORD || 'americanleads2026'

  if (password === correctPassword) {
    const response = NextResponse.json({ success: true })
    response.cookies.set('bl_auth', 'authorized', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return response
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
