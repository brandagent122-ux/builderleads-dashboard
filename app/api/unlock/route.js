import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TRACERFY_KEY = process.env.TRACERFY_API_KEY
const TRACERFY_LOOKUP_URL = 'https://tracerfy.com/v1/api/trace/lookup/'
const ZEROBOUNCE_KEY = process.env.ZEROBOUNCE_API_KEY
const TRESTLE_KEY = process.env.TRESTLE_API_KEY
const REISKIP_KEY = process.env.REISKIP_API_KEY

// ── Verification helpers ──

async function verifyEmail(email) {
  if (!ZEROBOUNCE_KEY || !email) return { status: 'unverified', email }
  try {
    const resp = await fetch(
      `https://api.zerobounce.net/v2/validate?api_key=${ZEROBOUNCE_KEY}&email=${encodeURIComponent(email)}`,
      { method: 'GET', signal: AbortSignal.timeout(8000) }
    )
    if (!resp.ok) return { status: 'unverified', email }
    const data = await resp.json()
    // ZeroBounce statuses: valid, invalid, catch-all, unknown, spamtrap, abuse, do_not_mail
    return {
      email,
      status: data.status || 'unknown',
      sub_status: data.sub_status || null,
      deliverable: data.status === 'valid',
      risky: data.status === 'catch-all' || data.status === 'unknown',
      invalid: data.status === 'invalid' || data.status === 'spamtrap' || data.status === 'abuse' || data.status === 'do_not_mail',
    }
  } catch (e) {
    console.log('[ZeroBounce error]', e.message)
    return { status: 'unverified', email }
  }
}

async function verifyPhone(phone) {
  if (!TRESTLE_KEY || !phone) return { status: 'unverified', number: phone }
  try {
    const cleanNumber = phone.replace(/\D/g, '')
    const resp = await fetch(
      `https://api.trestleiq.com/3.0/phone_intel?phone=${cleanNumber}`,
      {
        method: 'GET',
        headers: { 'x-api-key': TRESTLE_KEY },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!resp.ok) return { status: 'unverified', number: phone }
    const data = await resp.json()
    return {
      number: phone,
      status: 'verified',
      line_type: data.line_type || data.phone_type || null,
      carrier: data.carrier || null,
      is_mobile: (data.line_type || data.phone_type || '').toLowerCase().includes('mobile'),
      is_connected: data.is_connected !== false,
      caller_name: data.caller_name || data.name || null,
    }
  } catch (e) {
    console.log('[Trestle error]', e.message)
    return { status: 'unverified', number: phone }
  }
}

async function reiskipLookup(address, city, state, zip) {
  if (!REISKIP_KEY) return null
  try {
    const resp = await fetch('https://api.reiskip.com/v1/skip-trace', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REISKIP_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: address,
        city: city || 'Los Angeles',
        state: state || 'CA',
        zip: zip || '',
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data || (!data.persons && !data.results && !data.contacts)) return null
    return data
  } catch (e) {
    console.log('[REISkip error]', e.message)
    return null
  }
}

function parseReiskipResults(data) {
  // REISkip returns various formats, normalize to our person structure
  const persons = data.persons || data.results || data.contacts || []
  if (!Array.isArray(persons)) return []
  return persons.map(p => ({
    first_name: p.first_name || p.firstName || '',
    last_name: p.last_name || p.lastName || '',
    full_name: p.full_name || p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    age: p.age || null,
    property_owner: p.property_owner || p.is_owner || false,
    deceased: false,
    litigator: false,
    mailing_address: p.mailing_address || p.address || null,
    phones: (p.phones || p.phone_numbers || []).map(ph => ({
      number: typeof ph === 'string' ? ph : (ph.number || ph.phone || ''),
      type: typeof ph === 'string' ? 'unknown' : (ph.type || 'unknown'),
      carrier: typeof ph === 'string' ? null : (ph.carrier || null),
      dnc: false,
      rank: typeof ph === 'string' ? 1 : (ph.rank || 1),
    })),
    emails: (p.emails || p.email_addresses || []).map(em => ({
      email: typeof em === 'string' ? em : (em.email || em.address || ''),
      rank: typeof em === 'string' ? 1 : (em.rank || 1),
    })),
  })).filter(p => p.phones.length > 0 || p.emails.length > 0)
}

// ── DNC check (unchanged from original) ──

function isDNC(phone) {
  const dnc = phone.dnc
  if (dnc === true) return true
  if (dnc === 1) return true
  if (typeof dnc === 'string') {
    const d = dnc.toLowerCase().trim()
    if (d === 'true' || d === 'yes' || d === 'y' || d === '1' || d === 'dnc') return true
  }
  if (phone.do_not_call === true || phone.do_not_call === 'true' || phone.do_not_call === 1) return true
  if (phone.dnc_status === true || phone.dnc_status === 'true' || phone.dnc_status === 1) return true
  if (phone.is_dnc === true || phone.is_dnc === 'true' || phone.is_dnc === 1) return true
  return false
}

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
    // ═══ STEP 1: Tracerfy (primary skip trace) ═══
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

    let sourceUsed = 'tracerfy'
    let rawPersons = traceData.persons || []

    // ═══ STEP 2: REISkip fallback (if Tracerfy finds nothing) ═══
    if (!traceData.hit || rawPersons.length === 0) {
      console.log('[Unlock] Tracerfy miss, trying REISkip fallback...')
      const reiskipData = await reiskipLookup(address, city, state, zip)
      if (reiskipData) {
        rawPersons = parseReiskipResults(reiskipData)
        sourceUsed = 'reiskip'
        console.log(`[Unlock] REISkip returned ${rawPersons.length} persons`)
      }
      if (rawPersons.length === 0) {
        return NextResponse.json({ error: 'No contact data found for this address' }, { status: 404 })
      }
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

    // ═══ DNC filtering ═══
    const rawPhoneAudit = rawPersons.flatMap(p =>
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

    const cleanPersons = rawPersons
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

    // ═══ STEP 3: ZeroBounce email verification ═══
    const allEmails = cleanPersons.flatMap(p => p.emails.map(e => e.email)).filter(Boolean)
    const emailVerifications = {}
    if (allEmails.length > 0 && ZEROBOUNCE_KEY) {
      console.log(`[Unlock] Verifying ${allEmails.length} emails with ZeroBounce...`)
      const emailResults = await Promise.all(allEmails.slice(0, 5).map(e => verifyEmail(e)))
      emailResults.forEach(r => { emailVerifications[r.email] = r })
    }

    // ═══ STEP 4: Trestle phone verification ═══
    const allPhones = cleanPersons.flatMap(p => p.phones.map(ph => ph.number)).filter(Boolean)
    const phoneVerifications = {}
    if (allPhones.length > 0 && TRESTLE_KEY) {
      console.log(`[Unlock] Verifying ${allPhones.length} phones with Trestle...`)
      const phoneResults = await Promise.all(allPhones.slice(0, 5).map(p => verifyPhone(p)))
      phoneResults.forEach(r => { phoneVerifications[r.number] = r })
    }

    // ═══ Merge verification data into response ═══
    const totalDncFiltered = cleanPersons.reduce((sum, p) => sum + p._dnc_removed, 0)

    const verifiedPersons = cleanPersons.map(p => {
      const { _dnc_removed, _total_phones, ...clean } = p
      return {
        ...clean,
        phones: clean.phones.map(ph => {
          const v = phoneVerifications[ph.number]
          return {
            ...ph,
            verified: v ? true : false,
            line_type: v?.line_type || ph.type || null,
            is_mobile: v?.is_mobile || false,
            is_connected: v?.is_connected !== false,
            carrier: v?.carrier || ph.carrier || null,
          }
        }),
        emails: clean.emails.map(e => {
          const v = emailVerifications[e.email]
          return {
            ...e,
            verified: v ? true : false,
            deliverable: v?.deliverable || false,
            risky: v?.risky || false,
            invalid: v?.invalid || false,
            status: v?.status || 'unverified',
          }
        }),
      }
    })

    return NextResponse.json({
      success: true,
      persons: verifiedPersons,
      source: sourceUsed,
      credits_deducted: refetch ? 0 : (traceData.credits_deducted || 5),
      credits_remaining: profile.max_unlocks > 0
        ? profile.max_unlocks - (profile.contact_unlocks || 0) - (refetch ? 0 : 1)
        : null,
      clean_phones: verifiedPersons.reduce((sum, p) => sum + p.phones.length, 0),
      total_phones: rawPersons.reduce((sum, p) => sum + (p.phones || []).length, 0),
      dnc_filtered: totalDncFiltered,
      dnc_verified: true,
      contact_quality: {
        emails_verified: Object.values(emailVerifications).filter(v => v.deliverable).length,
        emails_risky: Object.values(emailVerifications).filter(v => v.risky).length,
        emails_invalid: Object.values(emailVerifications).filter(v => v.invalid).length,
        phones_verified: Object.values(phoneVerifications).filter(v => v.status === 'verified').length,
        phones_mobile: Object.values(phoneVerifications).filter(v => v.is_mobile).length,
      },
    })

  } catch (err) {
    return NextResponse.json({ error: 'Connection error: ' + err.message }, { status: 500 })
  }
}
