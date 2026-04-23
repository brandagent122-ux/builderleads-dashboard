import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TRACERFY_KEY = process.env.TRACERFY_API_KEY

export async function POST(request) {
  const { lead_id, address, city, state, user_id } = await request.json()

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

  // Check user credits
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

  // Try multiple possible Tracerfy endpoints
  const urls = [
    'https://app.tracerfy.com/api/v1/instant-trace/',
    'https://app.tracerfy.com/v1/api/instant-trace/',
    'https://api.tracerfy.com/v1/instant-trace/',
    'https://app.fastappend.com/v1/api/instant-trace/',
  ]

  let data = null
  let lastError = ''

  for (const url of urls) {
    try {
      const resp = await fetch(url, {
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

      if (resp.ok && !text.startsWith('<!')) {
        try {
          data = JSON.parse(text)
          break
        } catch {
          lastError = `${url} returned invalid JSON`
        }
      } else {
        lastError = `${url} returned ${resp.status}`
      }
    } catch (err) {
      lastError = `${url} failed: ${err.message}`
    }
  }

  if (!data) {
    return NextResponse.json({
      error: 'Could not reach Tracerfy. Contact support@tracerfy.com for the correct API endpoint.',
      debug: lastError,
    }, { status: 500 })
  }

  // Record the unlock
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
}