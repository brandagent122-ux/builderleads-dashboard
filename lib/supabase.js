import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Auth helpers
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

export async function acceptTOS(userId) {
  const { data, error } = await supabase.from('profiles').update({
    tos_accepted_at: new Date().toISOString()
  }).eq('id', userId)
  return { data, error }
}

export async function getAllProfiles() {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  return data || []
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId)
  return { data, error }
}

// Existing data functions below

export async function getStats() {
  const [leads, hot, destroyed, drafts, totalValue] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('fire_zone_match', true),
    supabase.from('scores').select('id', { count: 'exact', head: true }).gte('score', 75),
    supabase.from('owners').select('id,skip_trace_data', { count: 'exact' }).not('skip_trace_data', 'is', null),
    supabase.from('drafts').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('owners').select('assessor_value'),
  ])

  let destroyedCount = 0
  if (destroyed.data) {
    destroyedCount = destroyed.data.filter(o => {
      try {
        const d = typeof o.skip_trace_data === 'string' ? JSON.parse(o.skip_trace_data) : o.skip_trace_data
        return d && d.dins_damage && d.dins_damage.includes('Destroyed')
      } catch { return false }
    }).length
  }

  let rebuildValue = 0
  if (totalValue.data) {
    rebuildValue = totalValue.data.reduce((sum, o) => sum + (o.assessor_value || 0), 0)
  }

  return {
    totalLeads: leads.count || 0,
    hotLeads: hot.count || 0,
    destroyed: destroyedCount,
    pendingDrafts: drafts.count || 0,
    rebuildValue,
  }
}

export async function getTopLeads(limit = 10) {
  const { data: scores } = await supabase
    .from('scores')
    .select('lead_id,score,reasoning')
    .order('score', { ascending: false })
    .limit(limit)

  if (!scores || scores.length === 0) return []

  const leadIds = scores.map(s => s.lead_id)
  const [leadsRes, ownersRes] = await Promise.all([
    supabase.from('leads').select('*').in('id', leadIds),
    supabase.from('owners').select('*').in('lead_id', leadIds),
  ])

  const leadsMap = {}
  ;(leadsRes.data || []).forEach(l => leadsMap[l.id] = l)
  const ownersMap = {}
  ;(ownersRes.data || []).forEach(o => ownersMap[o.lead_id] = o)

  return scores.map(s => {
    const lead = leadsMap[s.lead_id] || {}
    const owner = ownersMap[s.lead_id] || {}
    let skip = {}
    try {
      skip = typeof owner.skip_trace_data === 'string' ? JSON.parse(owner.skip_trace_data) : (owner.skip_trace_data || {})
    } catch { skip = {} }

    return {
      id: s.lead_id,
      address: lead.address || '',
      score: s.score,
      reasoning: s.reasoning,
      permit_type: lead.permit_type || '',
      permit_stage: lead.permit_stage || '',
      permit_description: lead.permit_description || '',
      estimated_value: lead.estimated_value || 0,
      latitude: lead.latitude,
      longitude: lead.longitude,
      fire_zone_match: lead.fire_zone_match,
      assessor_value: owner.assessor_value || 0,
      sqft: skip.sqft_main || 0,
      beds: skip.beds || 0,
      baths: skip.baths || 0,
      year_built: skip.year_built || 0,
      dins_damage: skip.dins_damage || 'Unknown',
      dins_structure_type: skip.dins_structure_type || '',
      fire_damage_flag: skip.fire_damage_flag || '',
      created_at: lead.created_at || '',
    }
  })
}

export async function getAllLeads(filters = {}) {
  let query = supabase.from('leads').select('*').eq('fire_zone_match', true).order('id')

  if (filters.permit_type) query = query.eq('permit_type', filters.permit_type)
  if (filters.permit_stage) query = query.eq('permit_stage', filters.permit_stage)
  if (filters.search) query = query.ilike('address', `%${filters.search}%`)

  const { data: leads } = await query
  if (!leads || leads.length === 0) return []

  const leadIds = leads.map(l => l.id)

  const batchSize = 200
  let allScores = []
  let allOwners = []

  for (let i = 0; i < leadIds.length; i += batchSize) {
    const batch = leadIds.slice(i, i + batchSize)
    const [s, o] = await Promise.all([
      supabase.from('scores').select('lead_id,score').in('lead_id', batch),
      supabase.from('owners').select('lead_id,assessor_value,skip_trace_data,lot_size_sqft,owner_occupied,zoning,zoning_desc,max_far,flood_zone,flood_zone_desc').in('lead_id', batch),
    ])
    if (s.data) allScores.push(...s.data)
    if (o.data) allOwners.push(...o.data)
  }

  const scoresMap = {}
  allScores.forEach(s => scoresMap[s.lead_id] = s)
  const ownersMap = {}
  allOwners.forEach(o => ownersMap[o.lead_id] = o)

  let result = leads.map(l => {
    const score = scoresMap[l.id] || {}
    const owner = ownersMap[l.id] || {}
    let skip = {}
    try {
      skip = typeof owner.skip_trace_data === 'string' ? JSON.parse(owner.skip_trace_data) : (owner.skip_trace_data || {})
    } catch { skip = {} }

    return {
      id: l.id,
      address: l.address,
      score: score.score || 0,
      permit_type: l.permit_type,
      permit_stage: l.permit_stage,
      estimated_value: l.estimated_value,
      assessor_value: owner.assessor_value || 0,
      sqft: skip.sqft_main || 0,
      beds: skip.beds || 0,
      baths: skip.baths || 0,
      year_built: skip.year_built || 0,
      dins_damage: skip.dins_damage || 'Unknown',
      latitude: l.latitude,
      longitude: l.longitude,
      contractor_name: l.contractor_name || null,
      contractor_license: l.contractor_license || null,
      neighbor_permits_500ft: l.neighbor_permits_500ft || 0,
      street_permit_count: l.street_permit_count || 0,
      lot_size_sqft: owner.lot_size_sqft || null,
      owner_occupied: owner.owner_occupied ?? null,
      zoning: owner.zoning || null,
      zoning_desc: owner.zoning_desc || null,
      max_far: owner.max_far || null,
      flood_zone: owner.flood_zone || null,
      flood_zone_desc: owner.flood_zone_desc || null,
    }
  })

  if (filters.minScore) result = result.filter(r => r.score >= filters.minScore)
  if (filters.dins_damage) result = result.filter(r => r.dins_damage === filters.dins_damage)

  result.sort((a, b) => b.score - a.score)
  return result
}

export async function getLeadDetail(id) {
  const [leadRes, scoresRes, ownersRes, draftsRes, inspectionsRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('scores').select('*').eq('lead_id', id),
    supabase.from('owners').select('*').eq('lead_id', id).single(),
    supabase.from('drafts').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('inspections').select('*').eq('lead_id', id).order('inspection_date', { ascending: false }),
  ])

  const lead = leadRes.data || {}
  const scores = scoresRes.data || []
  const owner = ownersRes.data || {}
  const drafts = draftsRes.data || []
  const inspections = inspectionsRes.data || []

  let skip = {}
  try {
    skip = typeof owner.skip_trace_data === 'string' ? JSON.parse(owner.skip_trace_data) : (owner.skip_trace_data || {})
  } catch { skip = {} }

  let stackedPermits = []
  if (lead.address) {
    const { data: stacked } = await supabase
      .from('leads')
      .select('id,permit_number,permit_type,permit_stage,permit_filed_at,permit_issued_at,estimated_value,permit_description')
      .eq('address', lead.address)
      .order('permit_issued_at', { ascending: false })
    stackedPermits = (stacked || []).filter(s => s.id !== parseInt(id))
  }

  return {
    ...lead,
    score: scores[0]?.score || 0,
    reasoning: scores[0]?.reasoning || '',
    assessor_value: owner.assessor_value || 0,
    sqft: skip.sqft_main || 0,
    beds: skip.beds || 0,
    baths: skip.baths || 0,
    year_built: skip.year_built || 0,
    dins_damage: skip.dins_damage || 'Unknown',
    dins_structure_type: skip.dins_structure_type || '',
    fire_damage_flag: skip.fire_damage_flag || '',
    dins_match_distance_m: skip.dins_match_distance_m || null,
    lot_size_sqft: owner.lot_size_sqft || null,
    owner_occupied: owner.owner_occupied ?? null,
    zoning: owner.zoning || null,
    zoning_desc: owner.zoning_desc || null,
    hillside_zone: owner.hillside_zone ?? null,
    historic_zone: owner.historic_zone ?? null,
    max_far: owner.max_far || null,
    flood_zone: owner.flood_zone || null,
    flood_zone_desc: owner.flood_zone_desc || null,
    street_view_url: owner.street_view_url || null,
    drafts,
    stackedPermits,
    inspections,
  }
}

export async function getDrafts(status = null) {
  let query = supabase.from('drafts').select('*').order('created_at', { ascending: false })
  if (status && status !== 'all') query = query.eq('status', status)

  const { data } = await query
  if (!data || data.length === 0) return []

  const leadIds = [...new Set(data.map(d => d.lead_id))]
  const [leadsRes, scoresRes] = await Promise.all([
    supabase.from('leads').select('id,address').in('id', leadIds),
    supabase.from('scores').select('lead_id,score').in('lead_id', leadIds),
  ])

  const leadsMap = {}
  ;(leadsRes.data || []).forEach(l => leadsMap[l.id] = l)
  const scoresMap = {}
  ;(scoresRes.data || []).forEach(s => scoresMap[s.lead_id] = s)

  return data.map(d => ({
    ...d,
    address: leadsMap[d.lead_id]?.address || '',
    score: scoresMap[d.lead_id]?.score || 0,
  }))
}

export async function updateDraftStatus(id, status) {
  const { data, error } = await supabase
    .from('drafts')
    .update({ status })
    .eq('id', id)
    .select()
  return { data, error }
}
