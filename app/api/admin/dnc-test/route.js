import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-check'

const TRACERFY_KEY = process.env.TRACERFY_API_KEY
const TRACERFY_LOOKUP_URL = 'https://tracerfy.com/v1/api/trace/lookup/'

export async function POST(request) {
  const admin = await requireAdmin(request)
  if (admin instanceof NextResponse) return admin

  const { address, city, state } = await request.json()

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  try {
    const resp = await fetch(TRACERFY_LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRACERFY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        city: city || 'Los Angeles',
        state: state || 'CA',
        find_owner: true,
      }),
    })

    const data = await resp.json()

    if (!data.hit || !data.persons) {
      return NextResponse.json({ hit: false, raw: data })
    }

    // Show raw phone fields WITHOUT actual phone numbers (privacy)
    const audit = data.persons.map(person => ({
      name: person.full_name,
      phone_count: (person.phones || []).length,
      phones: (person.phones || []).map(ph => ({
        // Mask number for privacy: show last 4 only
        number_last4: ph.number ? ph.number.slice(-4) : '?',
        type: ph.type,
        carrier: ph.carrier,
        // Show ALL DNC-related fields and their types
        dnc: ph.dnc,
        dnc_type: typeof ph.dnc,
        do_not_call: ph.do_not_call,
        dnc_status: ph.dnc_status,
        is_dnc: ph.is_dnc,
        // Show all keys on this phone object
        all_keys: Object.keys(ph),
      })),
    }))

    return NextResponse.json({
      hit: true,
      audit,
      message: 'This shows raw DNC fields from Tracerfy. Check dnc, dnc_type, and all_keys.',
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
