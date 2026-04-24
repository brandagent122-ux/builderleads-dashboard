import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TRACERFY_KEY = process.env.TRACERFY_API_KEY
const TRACERFY_LOOKUP_URL = 'https://tracerfy.com/v1/api/trace/lookup/'

export async function POST(request) {
  const { lead_id, address, city, state, zip, user_id } = await request.json()

  if (!lead_id || !address || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check if already unlocked
  const { data: existing } = await adminSupabase
    .from('unlocks')
    .select('id')
    .eq('user_id', user_id)
    .eq('lead_id', lead_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already unlocked' }, { status: 400 })
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

  try {
    // Use the Instant Trace Lookup endpoint (synchronous, JSON in/out)
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

    // Check if it was a miss (no results found)
    if (!traceData.hit) {
      return NextResponse.json({ error: 'No contact data found for this address' }, { status: 404 })
    }

    // Record the unlock (do NOT store contact data permanently)
    await adminSupabase.from('unlocks').insert({
      user_id,
      lead_id,
      credit_charged: traceData.credits_deducted || 5,
    })

    await adminSupabase.from('profiles').update({
      contact_unlocks: (profile.contact_unlocks || 0) + 1,
    }).eq('id', user_id)

    return NextResponse.json({
      success: true,
      persons: traceData.persons || [],
      credits_deducted: traceData.credits_deducted || 5,
      credits_remaining: profile.max_unlocks > 0
        ? profile.max_unlocks - (profile.contact_unlocks || 0) - 1
        : null,
    })

  } catch (err) {
    return NextResponse.json({ error: 'Tracerfy connection error: ' + err.message }, { status: 500 })
  }
}
