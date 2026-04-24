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

  const { user_id, new_password } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  // Generate a random password if none provided
  const password = new_password || generatePassword()

  // Update auth password
  const { error } = await adminSupabase.auth.admin.updateUserById(user_id, {
    password: password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Store the temp password in profile
  await adminSupabase.from('profiles').update({
    temp_password: password,
  }).eq('id', user_id)

  return NextResponse.json({ success: true, password })
}

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 10; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)]
  }
  return pw
}
