import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TRACERFY_KEY = process.env.TRACERFY_API_KEY
const TRACERFY_TRACE_URL = 'https://tracerfy.com/v1/api/trace/'
const TRACERFY_QUEUE_URL = 'https://tracerfy.com/v1/api/queue/'

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
    // Create a minimal CSV in memory
    const csvContent = `address,city,state\n"${address}","${city || 'Pacific Palisades'}","${state || 'CA'}"`
    const blob = new Blob([csvContent], { type: 'text/csv' })

    const formData = new FormData()
    formData.append('csv_file', blob, 'lookup.csv')
    formData.append('address_column', 'address')
    formData.append('city_column', 'city')
    formData.append('state_column', 'state')
    formData.append('trace_type', 'normal')

    const traceResp = await fetch(TRACERFY_TRACE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRACERFY_KEY}`,
      },
      body: formData,
    })

    const traceText = await traceResp.text()
    let traceData
    try {
      traceData = JSON.parse(traceText)
    } catch {
      return NextResponse.json({ error: `Tracerfy trace error: ${traceText.substring(0, 200)}` }, { status: 500 })
    }

    if (!traceResp.ok) {
      return NextResponse.json({ error: traceData.detail || traceData.message || 'Tracerfy trace failed' }, { status: traceResp.status })
    }

    const queueId = traceData.queue_id
    if (!queueId) {
      return NextResponse.json({ error: 'No queue_id returned from Tracerfy' }, { status: 500 })
    }

    // Poll for results (usually takes 5-15 seconds for single address)
    let result = null
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000))

      const qResp = await fetch(`${TRACERFY_QUEUE_URL}${queueId}/`, {
        headers: { 'Authorization': `Bearer ${TRACERFY_KEY}` },
      })

      const qText = await qResp.text()
      let qData
      try {
        qData = JSON.parse(qText)
      } catch {
        continue
      }

      if (qData.pending === false && qData.download_url) {
        result = qData
        break
      }
    }

    if (!result || !result.download_url) {
      return NextResponse.json({ error: 'Tracerfy lookup timed out. Try again.' }, { status: 504 })
    }

    // Download the CSV results
    const csvResp = await fetch(result.download_url)
    const csvText = await csvResp.text()

    // Parse CSV to extract contact info
    const lines = csvText.split('\n').filter(l => l.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: 'No contact data found for this address' }, { status: 404 })
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const values = lines[1].split(',').map(v => v.trim().replace(/"/g, ''))

    const contact = {}
    headers.forEach((h, i) => {
      contact[h] = values[i] || ''
    })

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
      contact: contact,
      credits_remaining: profile.max_unlocks - (profile.contact_unlocks || 0) - 1,
    })

  } catch (err) {
    return NextResponse.json({ error: 'Tracerfy error: ' + err.message }, { status: 500 })
  }
}