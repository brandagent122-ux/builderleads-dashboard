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
      city: city || 'Pacific Palisades',
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

    // ── SERVER-SIDE DATA SANITIZATION ──
    // Strip DNC phones, deceased persons, and sensitive fields
    // Only clean, callable contact info reaches the client
    const cleanPersons = (traceData.persons || [])
      .filter(p => !p.deceased)
      .map(person => ({
        first_name: person.first_name || '',
        last_name: person.last_name || '',
        full_name: person.full_name || '',
        age: person.age || null,
        property_owner: person.property_owner || false,
        deceased: false,
        litigator: person.litigator || false,
        mailing_address: person.mailing_address || null,
        // Only include non-DNC phones
        phones: (person.phones || [])
          .filter(p => !p.dnc)
          .map(p => ({
            number: p.number,
            type: p.type,
            carrier: p.carrier || null,
            dnc: false,
            rank: p.rank,
          })),
        // Keep all emails
        emails: (person.emails || []).map(e => ({
          email: e.email,
          rank: e.rank,
        })),
      }))
      // Only include persons who have at least one clean phone or email
      .filter(p => p.phones.length > 0 || p.emails.length > 0)

    return NextResponse.json({
      success: true,
      persons: cleanPersons,
      credits_deducted: refetch ? 0 : (traceData.credits_deducted || 5),
      credits_remaining: profile.max_unlocks > 0
        ? profile.max_unlocks - (profile.contact_unlocks || 0) - (refetch ? 0 : 1)
        : null,
      clean_phones: cleanPersons.reduce((sum, p) => sum + p.phones.length, 0),
      total_phones: (traceData.persons || []).reduce((sum, p) => sum + (p.phones || []).length, 0),
      dnc_filtered: (traceData.persons || []).reduce((sum, p) => sum + (p.phones || []).filter(ph => ph.dnc).length, 0),
    })

  } catch (err) {
    return NextResponse.json({ error: 'Tracerfy connection error: ' + err.message }, { status: 500 })
  }
}
