import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Capture IP and user agent from headers
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const now = new Date().toISOString()

  // Update profile with TOS acceptance
  await adminSupabase.from('profiles').update({
    tos_accepted_at: now,
    tos_ip: ip,
    tos_user_agent: userAgent,
    tos_version: '1.0',
  }).eq('id', authUser.id)

  return NextResponse.json({ accepted: true, timestamp: now })
}
