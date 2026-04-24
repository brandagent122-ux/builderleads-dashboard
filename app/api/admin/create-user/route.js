import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-check'

export async function POST(request) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email, password, company_name, max_leads, trade } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

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

  const userId = data?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'User created but no ID returned' }, { status: 500 })
  }

  const profileUpdate = { role: 'client', tier: 'starter', temp_password: password }
  if (company_name) profileUpdate.company_name = company_name
  if (max_leads) profileUpdate.max_leads = parseInt(max_leads)
  if (trade) profileUpdate.trade = trade

  await adminSupabase.from('profiles').update(profileUpdate).eq('id', userId)

  const leadCount = parseInt(max_leads) || 50
  const { data: topLeads } = await adminSupabase
    .from('scores')
    .select('lead_id,score')
    .order('score', { ascending: false })
    .limit(leadCount)

  if (topLeads && topLeads.length > 0) {
    const assignments = topLeads.map(s => ({ user_id: userId, lead_id: s.lead_id }))
    await adminSupabase.from('assigned_leads').insert(assignments)
  }

  return NextResponse.json({
    user: { id: userId, email: data.user.email },
    leads_assigned: topLeads?.length || 0,
  })
}
