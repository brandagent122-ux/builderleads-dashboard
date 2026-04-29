import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TRACERFY_KEY = process.env.TRACERFY_API_KEY
const TRACERFY_LOOKUP_URL = 'https://tracerfy.com/v1/api/trace/lookup/'

export async function POST(request) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { lead_id, address, city, state, zip, user_id, refetch } = await request.json()

  if (user_id !== authUser.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!lead_id || !address || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify user has access to this lead
  const { data: assignment } = await adminSupabase
    .from('assigned_leads')
    .select('id')
    .eq('user_id', user_id)
    .eq('lead_id', lead_id)
    .single()

  // Allow admin to bypass assignment check
  const { data: userProfile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user_id)
    .single()

  if (!assignment && userProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Lead not assigned to you' }, { status: 403 })
  }

  // Check credits
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('contact_unlocks,max_unlocks,tier')
    .eq('id', user_id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (profile.max_unlocks > 0 && profile.contact_unlocks >= profile.max_unlocks) {
    return NextResponse.json({ error: 'No unlock credits remaining' }, { status: 403 })
  }

  // Check if already unlocked (skip on refetch)
  if (!refetch) {
    const { data: existing } = await adminSupabase
      .from('unlocks')
      .select('id')
      .eq('user_id', user_id)
      .eq('lead_id', lead_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already unlocked' }, { status: 400 })
    }
  }

  try {
    // Use Instant Trace Lookup (5 credits, includes DNC + carrier + age)
    const payload = {
      address: address,
      city: city || 'Los Angeles',
      state: state || 'CA',
      find_owner: true,
    }
    if (zip) payload.zip = zip

    const traceResp = await fetch(TRACERFY_LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRACERFY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const traceText = await traceResp.text()
    let traceData
    try {
      traceData = JSON.parse(traceText)
    } catch {
      return NextResponse.json(
        { error: `Tracerfy returned invalid response: ${traceText.substring(0, 300)}` },
        { status: 500 }
      )
    }

    if (!traceResp.ok) {
      const msg = traceData.detail || traceData.message || traceData.error || JSON.stringify(traceData)
      return NextResponse.json({ error: `Tracerfy error: ${msg}` }, { status: traceResp.status })
    }

    if (!traceData.hit) {
      return NextResponse.json({ error: 'No contact data found for this address' }, { status: 404 })
    }

    // Record the unlock (only on first unlock, not refetch)
    if (!refetch) {
      await adminSupabase.from('unlocks').insert({
        user_id,
        lead_id,
        credit_charged: traceData.credits_deducted || 5,
      })

      await adminSupabase.from('profiles').update({
        contact_unlocks: (profile.contact_unlocks || 0) + 1,
      }).eq('id', user_id)
    }

    // ── SERVER-SIDE DNC FILTERING (CRITICAL COMPLIANCE) ──
    // Check ALL possible DNC field formats from Tracerfy
    // Log raw phone data for audit trail
    function isDNC(phone) {
      // Check 'dnc' field in every possible format
      const dnc = phone.dnc
      if (dnc === true) return true
      if (dnc === 1) return true
      if (typeof dnc === 'string') {
        const d = dnc.toLowerCase().trim()
        if (d === 'true' || d === 'yes' || d === 'y' || d === '1' || d === 'dnc') return true
      }
      // Check alternative field names
      if (phone.do_not_call === true || phone.do_not_call === 'true' || phone.do_not_call === 1) return true
      if (phone.dnc_status === true || phone.dnc_status === 'true' || phone.dnc_status === 1) return true
      if (phone.is_dnc === true || phone.is_dnc === 'true' || phone.is_dnc === 1) return true
      return false
    }

    // Log raw phone data for compliance audit (no actual numbers, just DNC fields)
    const rawPhoneAudit = (traceData.persons || []).flatMap(p =>
      (p.phones || []).map(ph => ({
        dnc_raw: ph.dnc,
        dnc_type: typeof ph.dnc,
        do_not_call: ph.do_not_call,
        dnc_status: ph.dnc_status,
        is_dnc: ph.is_dnc,
        all_keys: Object.keys(ph),
        isDNC_result: isDNC(ph),
      }))
    )
    console.log('[DNC AUDIT]', JSON.stringify(rawPhoneAudit))

    const cleanPersons = (traceData.persons || [])
      .filter(p => !p.deceased)
      .map(person => {
        const allPhones = person.phones || []
        const dncPhones = allPhones.filter(p => isDNC(p))
        const cleanPhones = allPhones.filter(p => !isDNC(p))

        return {
          first_name: person.first_name || '',
          last_name: person.last_name || '',
          full_name: person.full_name || '',
          age: person.age || null,
          property_owner: person.property_owner || false,
          deceased: false,
          litigator: person.litigator || false,
          mailing_address: person.mailing_address || null,
          phones: cleanPhones.map(p => ({
            number: p.number,
            type: p.type,
            carrier: p.carrier || null,
            dnc: false,
            rank: p.rank,
          })),
          emails: (person.emails || []).map(e => ({
            email: e.email,
            rank: e.rank,
          })),
          _dnc_removed: dncPhones.length,
          _total_phones: allPhones.length,
        }
      })
      .filter(p => p.phones.length > 0 || p.emails.length > 0)

    const totalDncFiltered = cleanPersons.reduce((sum, p) => sum + p._dnc_removed, 0)

    return NextResponse.json({
      success: true,
      persons: cleanPersons.map(p => {
        const { _dnc_removed, _total_phones, ...clean } = p
        return clean
      }),
      credits_deducted: refetch ? 0 : (traceData.credits_deducted || 5),
      credits_remaining: profile.max_unlocks > 0
        ? profile.max_unlocks - (profile.contact_unlocks || 0) - (refetch ? 0 : 1)
        : null,
      clean_phones: cleanPersons.reduce((sum, p) => sum + p.phones.length, 0),
      total_phones: (traceData.persons || []).reduce((sum, p) => sum + (p.phones || []).length, 0),
      dnc_filtered: totalDncFiltered,
      dnc_verified: true,
    })

  } catch (err) {
    return NextResponse.json({ error: 'Tracerfy connection error: ' + err.message }, { status: 500 })
  }
}
