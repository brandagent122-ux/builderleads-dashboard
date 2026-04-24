import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { email, password, company_name, max_leads, trade } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  // Create the auth user with service key (bypasses email confirmation)
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Update the profile with additional fields
  if (data?.user?.id) {
    const profileUpdate = {
      role: 'client',
      tier: 'starter',
    }
    if (company_name) profileUpdate.company_name = company_name
    if (max_leads) profileUpdate.max_leads = parseInt(max_leads)
    if (trade) profileUpdate.trade = trade

    await adminSupabase.from('profiles').update(profileUpdate).eq('id', data.user.id)
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}
