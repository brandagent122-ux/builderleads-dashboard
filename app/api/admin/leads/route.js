import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  const { action, user_id, lead_ids, preset, count } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  if (action === 'assign') {
    if (!lead_ids || lead_ids.length === 0) {
      return NextResponse.json({ error: 'No leads selected' }, { status: 400 })
    }
    const rows = lead_ids.map(lid => ({ user_id, lead_id: lid }))
    const { error } = await adminSupabase.from('assigned_leads').upsert(rows, { onConflict: 'user_id,lead_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ assigned: lead_ids.length })
  }

  if (action === 'remove') {
    if (!lead_ids || lead_ids.length === 0) {
      return NextResponse.json({ error: 'No leads selected' }, { status: 400 })
    }
    const { error } = await adminSupabase
      .from('assigned_leads')
      .delete()
      .eq('user_id', user_id)
      .in('lead_id', lead_ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ removed: lead_ids.length })
  }

  if (action === 'clear') {
    const { error } = await adminSupabase
      .from('assigned_leads')
      .delete()
      .eq('user_id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ cleared: true })
  }

  if (action === 'preset') {
    const n = parseInt(count) || 10

    // Clear existing
    await adminSupabase.from('assigned_leads').delete().eq('user_id', user_id)

    let query = adminSupabase.from('scores').select('lead_id,score').order('score', { ascending: false })

    let leads = []

    if (preset === 'top') {
      const { data } = await query.limit(n)
      leads = data || []
    } else if (preset === 'random_mix') {
      // Pull from each score tier
      const hot = await adminSupabase.from('scores').select('lead_id,score').gte('score', 85).order('score', { ascending: false }).limit(200)
      const warm = await adminSupabase.from('scores').select('lead_id,score').gte('score', 60).lt('score', 85).order('score', { ascending: false }).limit(200)
      const cool = await adminSupabase.from('scores').select('lead_id,score').lt('score', 60).order('score', { ascending: false }).limit(200)

      const hotArr = hot.data || []
      const warmArr = warm.data || []
      const coolArr = cool.data || []

      // Shuffle each
      const shuffle = arr => arr.sort(() => Math.random() - 0.5)
      shuffle(hotArr)
      shuffle(warmArr)
      shuffle(coolArr)

      // Take ~30% hot, ~40% warm, ~30% cool
      const hotCount = Math.max(1, Math.round(n * 0.3))
      const warmCount = Math.max(1, Math.round(n * 0.4))
      const coolCount = n - hotCount - warmCount

      leads = [
        ...hotArr.slice(0, hotCount),
        ...warmArr.slice(0, warmCount),
        ...coolArr.slice(0, coolCount),
      ]
    } else if (preset === 'warm_only') {
      const { data } = await adminSupabase.from('scores').select('lead_id,score').gte('score', 50).lt('score', 75).order('score', { ascending: false }).limit(n)
      leads = data || []
    }

    if (leads.length > 0) {
      const rows = leads.map(s => ({ user_id, lead_id: s.lead_id }))
      await adminSupabase.from('assigned_leads').upsert(rows, { onConflict: 'user_id,lead_id' })
    }

    return NextResponse.json({ assigned: leads.length, preset })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// GET: fetch assigned leads for a user
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const { data: assignments } = await adminSupabase
    .from('assigned_leads')
    .select('lead_id')
    .eq('user_id', userId)

  const leadIds = (assignments || []).map(a => a.lead_id)

  if (leadIds.length === 0) {
    return NextResponse.json({ assigned: [], available: [] })
  }

  // Get assigned lead details
  const { data: leads } = await adminSupabase
    .from('leads')
    .select('id,address')
    .in('id', leadIds)

  const { data: scores } = await adminSupabase
    .from('scores')
    .select('lead_id,score')
    .in('lead_id', leadIds)

  const scoresMap = {}
  ;(scores || []).forEach(s => scoresMap[s.lead_id] = s.score)

  const assigned = (leads || []).map(l => ({
    id: l.id,
    address: l.address,
    score: scoresMap[l.id] || 0,
  })).sort((a, b) => b.score - a.score)

  return NextResponse.json({ assigned })
}
