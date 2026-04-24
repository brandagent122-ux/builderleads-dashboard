import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { user_id, action } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  if (action === 'revoke') {
    // Set role to paused
    await adminSupabase.from('profiles').update({ role: 'paused' }).eq('id', user_id)

    // Sign them out of ALL sessions globally
    await adminSupabase.auth.admin.signOut(user_id, 'global')

    return NextResponse.json({ success: true, status: 'revoked' })
  }

  if (action === 'restore') {
    await adminSupabase.from('profiles').update({ role: 'client' }).eq('id', user_id)
    return NextResponse.json({ success: true, status: 'restored' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
