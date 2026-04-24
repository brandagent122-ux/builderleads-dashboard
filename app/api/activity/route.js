import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { action, details, lead_id } = await request.json()

  if (!action) {
    return NextResponse.json({ error: 'Action required' }, { status: 400 })
  }

  await adminSupabase.from('activity_log').insert({
    user_id: user.id,
    action,
    details: details || null,
    lead_id: lead_id || null,
  })

  return NextResponse.json({ logged: true })
}
