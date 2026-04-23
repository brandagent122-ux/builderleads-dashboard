import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TRACERFY_KEY = process.env.TRACERFY_API_KEY
const TRACERFY_URL = 'https://tracerfy.com/v1/api/instant-trace/'

export async function POST(request) {
  const { lead_id, address, city, state, user_id } = await request.json()

  if (!lead_id || !address || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: existing } = await adminSupabase
    .from('unlocks')
    .select('id')
    .eq('user_id', user_id)
    .eq('lead_id', lead_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already unlocked' }, { status: 400 })
  }

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
    const resp = await fetch(TRACERFY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRACERFY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: address,
        city: city || 'Pacific Palisades',
        state: state || 'CA',
        find_owner: true,
      }),
    })

    const text = await resp.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: `Tracerfy returned invalid response: ${text.substring(0, 200)}` }, { status: 500 })
    }

    if (!resp.ok) {
      return NextResponse.json({ error: data.detail || data.message || `Tracerfy error ${resp.status}` }, { status: resp.status })
    }

    await adminSupabase.from('unlocks').insert({
      user_id,
      lead_id,
      credit_charged: 1,
    })

    await adminSupabase.from('profiles').update({
      contact_unlocks: (profile.contact_unlocks || 0) + 1,
    }).eq('id', user_id)

    return NextResponse.json({
      success: true,
      contact: data,
      credits_remaining: profile.max_unlocks - (profile.contact_unlocks || 0) - 1,
    })

  } catch (err) {
    return NextResponse.json({ error: 'Failed to reach Tracerfy: ' + err.message }, { status: 500 })
  }
}