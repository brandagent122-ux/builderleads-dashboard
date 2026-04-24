import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const minScore = parseInt(searchParams.get('min_score')) || 0
  const maxScore = parseInt(searchParams.get('max_score')) || 100
  const limit = parseInt(searchParams.get('limit')) || 50

  // Get scores in range
  let scoreQuery = adminSupabase
    .from('scores')
    .select('lead_id,score')
    .gte('score', minScore)
    .lte('score', maxScore)
    .order('score', { ascending: false })
    .limit(200)

  const { data: scores } = await scoreQuery
  if (!scores || scores.length === 0) {
    return NextResponse.json({ leads: [] })
  }

  const leadIds = scores.map(s => s.lead_id)
  const scoresMap = {}
  scores.forEach(s => scoresMap[s.lead_id] = s.score)

  // Get lead addresses
  let leadsQuery = adminSupabase
    .from('leads')
    .select('id,address,permit_type,permit_stage')
    .in('id', leadIds)

  if (search) {
    leadsQuery = leadsQuery.ilike('address', `%${search}%`)
  }

  const { data: leads } = await leadsQuery

  const result = (leads || []).map(l => ({
    id: l.id,
    address: l.address,
    permit_type: l.permit_type,
    permit_stage: l.permit_stage,
    score: scoresMap[l.id] || 0,
  })).sort((a, b) => b.score - a.score).slice(0, limit)

  return NextResponse.json({ leads: result })
}
