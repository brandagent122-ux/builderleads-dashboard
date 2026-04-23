import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const cookieStore = cookies()

  // Clear all Supabase auth cookies
  const allCookies = cookieStore.getAll()
  const response = NextResponse.redirect(new URL('/login', request.url))

  allCookies.forEach(cookie => {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.delete(cookie.name)
    }
  })

  // Also clear old password cookie if it exists
  response.cookies.delete('bl_auth')

  return response
}
