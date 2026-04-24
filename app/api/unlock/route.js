import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TRACERFY_KEY = process.env.TRACERFY_API_KEY
const TRACERFY_TRACE_URL = 'https://tracerfy.com/v1/api/trace/'
const TRACERFY_QUEUE_URL = 'https://tracerfy.com/v1/api/queue/'

// Transform flat queue response into persons format for the UI
function transformQueueData(records) {
  return records.map(r => {
    const phones = []
    // Collect all phone fields
    for (let i = 1; i <= 5; i++) {
      const mobile = r[`mobile_${i}`]
      if (mobile) phones.push({ number: mobile, type: 'Mobile', dnc: false, rank: phones.length + 1 })
    }
    for (let i = 1; i <= 3; i++) {
      const landline = r[`landline_${i}`]
      if (landline) phones.push({ number: landline, type: 'Landline', dnc: false, rank: phones.length + 1 })
    }
    // If primary_phone exists and isn't already in the list, add it first
    if (r.primary_phone) {
      const exists = phones.some(p => p.number === r.primary_phone)
      if (!exists) {
        phones.unshift({ number: r.primary_phone, type: r.primary_phone_type || 'Unknown', dnc: false, rank: 1 })
      }
    }

    const emails = []
    for (let i = 1; i <= 5; i++) {
      const email = r[`email_${i}`]
      if (email) emails.push({ email, rank: i })
    }

    return {
      first_name: r.first_name || '',
      last_name: r.last_name || '',
      full_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Unknown',
      property_owner: true,
      deceased: false,
      litigator: false,
      age: null,
      phones,
      emails,
      mailing_address: (r.mail_address || r.mailing_address) ? {
        street: r.mail_address || r.mailing_address || '',
        city: r.mail_city || r.mailing_city || '',
        state: r.mail_state || r.mailing_state || '',
        zip: r.mail_zip || r.mailing_zip || '',
      } : null,
    }
  }).filter(p => p.phones.length > 0 || p.emails.length > 0)
}

export async function POST(request) {
  const { lead_id, address, city, state, zip, user_id, refetch } = await request.json()

  if (!lead_id || !address || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

  // ─── RE-FETCH: Pull from existing queue (FREE) ───
  if (refetch) {
    const { data: unlock } = await adminSupabase
      .from('unlocks')
      .select('tracerfy_queue_id')
      .eq('user_id', user_id)
      .eq('lead_id', lead_id)
      .single()

    if (!unlock || !unlock.tracerfy_queue_id) {
      return NextResponse.json({ error: 'No previous trace found. Unlock first.' }, { status: 404 })
    }

    try {
      const qResp = await fetch(`${TRACERFY_QUEUE_URL}${unlock.tracerfy_queue_id}`, {
        headers: { 'Authorization': `Bearer ${TRACERFY_KEY}` },
      })

      if (!qResp.ok) {
        const errText = await qResp.text()
        return NextResponse.json({ error: `Tracerfy queue fetch failed: ${errText.substring(0, 200)}` }, { status: qResp.status })
      }

      const records = await qResp.json()
      const persons = transformQueueData(Array.isArray(records) ? records : [records])

      return NextResponse.json({
        success: true,
        persons,
        credits_deducted: 0,
        credits_remaining: profile.max_unlocks > 0
          ? profile.max_unlocks - (profile.contact_unlocks || 0)
          : null,
        source: 'cache',
      })
    } catch (err) {
      return NextResponse.json({ error: 'Failed to fetch from Tracerfy: ' + err.message }, { status: 500 })
    }
  }

  // ─── NEW UNLOCK: Batch trace (2 credits for advanced) ───

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

  if (profile.max_unlocks > 0 && profile.contact_unlocks >= profile.max_unlocks) {
    return NextResponse.json({ error: 'No unlock credits remaining' }, { status: 403 })
  }

  try {
    // Build a minimal CSV for batch trace
    const csvContent = `address,city,state\n"${address}","${city || 'Pacific Palisades'}","${state || 'CA'}"`
    const blob = new Blob([csvContent], { type: 'text/csv' })

    const formData = new FormData()
    formData.append('csv_file', blob, 'lookup.csv')
    formData.append('address_column', 'address')
    formData.append('city_column', 'city')
    formData.append('state_column', 'state')
    formData.append('trace_type', 'advanced')

    const traceResp = await fetch(TRACERFY_TRACE_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TRACERFY_KEY}` },
      body: formData,
    })

    const traceText = await traceResp.text()
    let traceData
    try {
      traceData = JSON.parse(traceText)
    } catch {
      return NextResponse.json({ error: `Tracerfy returned invalid response: ${traceText.substring(0, 300)}` }, { status: 500 })
    }

    if (!traceResp.ok) {
      const msg = traceData.detail || traceData.message || traceData.error || JSON.stringify(traceData)
      return NextResponse.json({ error: `Tracerfy error: ${msg}` }, { status: traceResp.status })
    }

    const queueId = traceData.queue_id
    if (!queueId) {
      return NextResponse.json({ error: 'No queue_id returned from Tracerfy' }, { status: 500 })
    }

    // Poll for completion (single address = usually 5-15 seconds)
    let records = null
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))

      const qResp = await fetch(`${TRACERFY_QUEUE_URL}${queueId}`, {
        headers: { 'Authorization': `Bearer ${TRACERFY_KEY}` },
      })

      if (!qResp.ok) continue

      const qData = await qResp.json()

      // Queue endpoint returns an array of records when done
      if (Array.isArray(qData) && qData.length > 0) {
        records = qData
        break
      }
    }

    if (!records) {
      return NextResponse.json({ error: 'Tracerfy lookup timed out. Try again in a moment.' }, { status: 504 })
    }

    const persons = transformQueueData(records)

    // Record the unlock WITH queue_id for free re-fetches
    await adminSupabase.from('unlocks').insert({
      user_id,
      lead_id,
      credit_charged: traceData.credits_per_lead || 2,
      tracerfy_queue_id: queueId,
    })

    await adminSupabase.from('profiles').update({
      contact_unlocks: (profile.contact_unlocks || 0) + 1,
    }).eq('id', user_id)

    return NextResponse.json({
      success: true,
      persons,
      credits_deducted: traceData.credits_per_lead || 2,
      credits_remaining: profile.max_unlocks > 0
        ? profile.max_unlocks - (profile.contact_unlocks || 0) - 1
        : null,
      source: 'trace',
    })

  } catch (err) {
    return NextResponse.json({ error: 'Tracerfy connection error: ' + err.message }, { status: 500 })
  }
}
