import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { email, password, company_name } = await request.json()

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (data?.user?.id && company_name) {
    await adminSupabase.from('profiles').update({ company_name }).eq('id', data.user.id)
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}