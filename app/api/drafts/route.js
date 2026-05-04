import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get user profile to check role
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Get assigned lead IDs for non-admin users
  let assignedLeadIds = null
  if (!isAdmin) {
    const { data: assigned } = await adminSupabase
      .from('assigned_leads')
      .select('lead_id')
      .eq('user_id', authUser.id)
    assignedLeadIds = (assigned || []).map(a => a.lead_id)
    if (assignedLeadIds.length === 0) {
      return NextResponse.json({ drafts: [] })
    }
  }

  // Fetch all drafts (no status filter - client handles tab filtering)
  let query = adminSupabase.from('drafts').select('*').order('created_at', { ascending: false })
  if (assignedLeadIds) {
    query = query.in('lead_id', assignedLeadIds)
  }

  const { data: drafts } = await query
  if (!drafts || drafts.length === 0) {
    return NextResponse.json({ drafts: [] })
  }

  // Enrich with address and score
  const leadIds = [...new Set(drafts.map(d => d.lead_id))]
  const [leadsRes, scoresRes] = await Promise.all([
    adminSupabase.from('leads').select('id,address').in('id', leadIds),
    adminSupabase.from('scores').select('lead_id,score').in('lead_id', leadIds),
  ])

  const leadsMap = {}
  ;(leadsRes.data || []).forEach(l => leadsMap[l.id] = l)
  const scoresMap = {}
  ;(scoresRes.data || []).forEach(s => scoresMap[s.lead_id] = s)

  const enriched = drafts.map(d => ({
    ...d,
    address: leadsMap[d.lead_id]?.address || '',
    score: scoresMap[d.lead_id]?.score || 0,
  }))

  return NextResponse.json({ drafts: enriched })
}
