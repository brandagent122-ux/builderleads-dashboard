import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

// ═══════════════════════════════════════
// AGENT 1: LEAD PROFILER (no API call)
// ═══════════════════════════════════════
function profileLead(lead, owner, score) {
  const desc = (lead.permit_description || '').toLowerCase()
  const isFire = lead.fire_zone_match === true

  // Detect project type from description
  let projectType = 'renovation'
  if (desc.includes('adu') || desc.includes('accessory dwelling') || desc.includes('granny')) projectType = 'adu'
  else if (desc.includes('new single family') || desc.includes('new two story') || desc.includes('new 2-story') || desc.includes('new 3-story') || lead.permit_type === 'Bldg-New') projectType = 'new_build'
  else if (desc.includes('addition') || lead.permit_type === 'Bldg-Addition') projectType = 'addition'
  else if (desc.includes('kitchen')) projectType = 'kitchen_remodel'
  else if (desc.includes('bathroom')) projectType = 'bathroom_remodel'
  else if (desc.includes('pool') || desc.includes('spa') || lead.permit_type === 'Swimming-Pool/Spa') projectType = 'pool'
  else if (desc.includes('demo') || lead.permit_type === 'Bldg-Demolition') projectType = 'demolition'
  else if (desc.includes('solar')) projectType = 'solar'
  else if (desc.includes('re-roof') || desc.includes('reroof') || desc.includes('roofing')) projectType = 'roofing'
  else if (desc.includes('convert') && desc.includes('garage')) projectType = 'garage_conversion'

  // Budget tier
  const assessed = owner?.assessor_value || 0
  let budgetTier = 'unknown'
  if (assessed >= 3000000) budgetTier = 'luxury'
  else if (assessed >= 1500000) budgetTier = 'high'
  else if (assessed >= 500000) budgetTier = 'mid'
  else if (assessed > 0) budgetTier = 'moderate'

  // Competition status
  const hasContractor = lead.contractor_name && lead.contractor_name !== 'Not in public record' && lead.contractor_name !== 'None listed'

  // Urgency
  let urgency = 'medium'
  const stage = (lead.permit_stage || '').toLowerCase()
  if (stage.includes('issued') && !hasContractor) urgency = 'high'
  else if (stage.includes('plan check') || stage.includes('submitted')) urgency = 'low'
  else if (stage.includes('finaled') || stage.includes('cofo')) urgency = 'low'

  return {
    project_type: projectType,
    project_type_label: projectType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    permit_type: lead.permit_type,
    permit_stage: lead.permit_stage,
    permit_description: lead.permit_description || '',
    estimated_value: lead.estimated_value || 0,
    address: lead.address,
    market: lead.market || 'palisades',
    is_fire: isFire,
    dins_damage: lead.dins_damage,
    score: score?.score || 0,
    urgency,
    has_contractor: hasContractor,
    contractor_name: lead.contractor_name,
    owner_occupied: owner?.owner_occupied,
    assessed_value: assessed,
    budget_tier: budgetTier,
    sqft: owner?.skip_trace_data?.sqft || 0,
    year_built: owner?.skip_trace_data?.year_built || 0,
    lot_size: owner?.lot_size_sqft || 0,
    zoning: owner?.zoning || '',
    neighbor_permits: lead.neighbor_permits_500ft || 0,
    street_permits: lead.street_permit_count || 0,
    permit_stack_count: lead.permit_stack_count || 1,
  }
}

// ═══════════════════════════════════════
// AGENT 2: ANGLE SELECTOR (no API call, perf-aware)
// ═══════════════════════════════════════
function selectAngle(profile, anglePerformance = []) {
  // Build a set of deprioritized angles (< 50% approval after 10+ uses)
  const badAngles = new Set()
  anglePerformance.forEach(a => {
    const total = (a.approved_clean || 0) + (a.approved_edited || 0) + (a.rejected || 0)
    if (total >= 10) {
      const approvalRate = ((a.approved_clean || 0) + (a.approved_edited || 0)) / total
      if (approvalRate < 0.5) badAngles.add(a.angle)
    }
  })
  // Build ranked candidate list (best match first)
  const candidates = []

  // Fire rebuild, displaced homeowner
  if (profile.is_fire && profile.dins_damage === 'Destroyed' && !profile.has_contractor) {
    candidates.push({
      angle: 'empathy_expertise',
      talking_points: [
        'Acknowledge the difficulty of losing their home without being over-sympathetic',
        'Mention specific experience with fire rebuilds in the area',
        `Reference ${profile.neighbor_permits} nearby properties also rebuilding`,
        'Offer a no-pressure walkthrough to discuss the rebuild process',
      ],
    })
  }

  // ADU or garage conversion
  if (profile.project_type === 'adu' || profile.project_type === 'garage_conversion') {
    candidates.push({
      angle: 'education_simplicity',
      talking_points: [
        'ADU permitting is complex, position as someone who navigates it daily',
        'Mention specific ADU experience and how many completed',
        'Reference their specific permit type (detached ADU, garage conversion, etc)',
        'Keep it simple, homeowners are often overwhelmed by ADU regulations',
      ],
    })
  }

  // New build, high value
  if ((profile.project_type === 'new_build' && profile.budget_tier === 'high') || profile.budget_tier === 'luxury') {
    candidates.push({
      angle: 'portfolio_credibility',
      talking_points: [
        'Lead with quality and craftsmanship, not price',
        'Reference similar projects completed in their neighborhood',
        'Mention project management capability for complex builds',
        `Property value ($${(profile.assessed_value / 1e6).toFixed(1)}M) suggests premium expectations`,
      ],
    })
  }

  // Multiple permits, complex project
  if (profile.permit_stack_count >= 3) {
    candidates.push({
      angle: 'project_management',
      talking_points: [
        `${profile.permit_stack_count} permits indicate a complex multi-phase project`,
        'Emphasize coordination experience across trades',
        'Mention timeline management and inspection scheduling',
        'Position as someone who handles the complexity so they don\'t have to',
      ],
    })
  }

  // Active neighborhood
  if (profile.neighbor_permits >= 5) {
    candidates.push({
      angle: 'social_proof_convenience',
      talking_points: [
        `${profile.neighbor_permits} properties within 500ft have active permits`,
        'Already working in the area (or about to be)',
        'Convenience of having a contractor already on the block',
        'Mention familiarity with the neighborhood and local requirements',
      ],
    })
  }

  // Kitchen or bathroom remodel
  if (profile.project_type === 'kitchen_remodel' || profile.project_type === 'bathroom_remodel') {
    candidates.push({
      angle: 'expertise_transformation',
      talking_points: [
        `Reference their specific project (${profile.project_type_label})`,
        'Mention recent similar projects completed',
        'Focus on design options and material selections',
        'Keep budget discussion for the in-person meeting',
      ],
    })
  }

  // Default always available
  candidates.push({
    angle: 'timing_availability',
    talking_points: [
      'Reference the specific permit they filed',
      'Mention availability in their area',
      'Low-pressure CTA for a quick consultation',
      'Keep it brief and professional',
    ],
  })

  // Pick the first candidate that isn't deprioritized
  const selected = candidates.find(c => !badAngles.has(c.angle)) || candidates[candidates.length - 1]

  // Log if we skipped a bad angle
  if (candidates[0] && candidates[0].angle !== selected.angle) {
    console.log(`[AngleSelector] Skipped deprioritized angle "${candidates[0].angle}", using "${selected.angle}" instead`)
  }

  return selected
}

// ═══════════════════════════════════════
// AGENT 3-5: DRAFT WRITER + COMPLIANCE + SUBJECT LINES (Claude)
// ═══════════════════════════════════════
async function writeDraft(profile, angle, voiceProfile, subjectPreference) {
  const voiceInstructions = voiceProfile ? `
CONTRACTOR VOICE PROFILE (match this style):
- Formality level: ${voiceProfile.formality}/10
- Greeting style: ${voiceProfile.greeting_style || 'Hi {first_name}'}
- Sign-off style: ${voiceProfile.signoff_style || '{contractor_name}, {company}'}
- Words to USE: ${(voiceProfile.preferred_words || []).join(', ') || 'none learned yet'}
- Words to AVOID: ${(voiceProfile.banned_words || []).join(', ') || 'none learned yet'}
- CTA style: ${voiceProfile.cta_style || 'casual_visit'}
` : ''

  const subjectInstructions = subjectPreference ? `\nSUBJECT LINE PREFERENCE: ${subjectPreference}\n` : ''

  const prompt = `You are a skilled email copywriter for a construction contractor. Write a short outreach email to a property owner based on the lead intelligence below.

LEAD PROFILE:
- Address: ${profile.address}
- Project type: ${profile.project_type_label}
- Permit: ${profile.permit_type} (${profile.permit_stage})
- Work description: ${profile.permit_description}
- Permit value: $${(profile.estimated_value || 0).toLocaleString()}
- Property value: $${(profile.assessed_value || 0).toLocaleString()}
- Square footage: ${profile.sqft || 'unknown'}
- Year built: ${profile.year_built || 'unknown'}
- Owner occupied: ${profile.owner_occupied === true ? 'Yes' : profile.owner_occupied === false ? 'No' : 'Unknown'}
- Contractor on permit: ${profile.has_contractor ? profile.contractor_name : 'None listed (open opportunity)'}
- Nearby permits (500ft): ${profile.neighbor_permits}
- Same street permits: ${profile.street_permits}
${profile.is_fire ? `- Fire damage: ${profile.dins_damage}\n- This is a wildfire rebuild zone` : '- This is a general construction market (NOT fire related)'}

OUTREACH ANGLE: ${angle.angle}
TALKING POINTS:
${angle.talking_points.map(tp => `- ${tp}`).join('\n')}

${voiceInstructions}
${subjectInstructions}
RULES (STRICT):
1. Subject line: under 8 words, specific to their property or project. Generate 3 options.
2. Email body: 4-6 sentences MAX. Short paragraphs.
3. Opening line MUST reference something specific about THEIR project (permit type, address, or project scope). Never start generic.
4. Include ONE line of credibility (experience, similar projects, local knowledge).
5. If neighbors are rebuilding (5+), mention it naturally as social proof.
6. CTA: low pressure, specific. "Happy to stop by" or "Worth a 15 min walkthrough" not "Contact us today."
7. Sign off with: [Contractor Name], [Company Name], Lic# [number] (leave as placeholders)
8. NO em dashes anywhere.
9. NO "leverage," "elevate," "streamline," "I'd be delighted," "reach out," or any AI-sounding phrases.
10. Write like a real contractor who types emails on their phone. Casual, direct, human.
11. Do NOT mention insurance claims, pricing, or timelines.
12. Do NOT use pressure language ("limited time," "act now," "don't miss out").
13. Do NOT pretend to know them ("we spoke last week," "your neighbor mentioned you").
14. Do NOT make unverified claims ("award-winning," "#1 rated").
15. Tone: helpful neighbor who happens to be a contractor.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
SUBJECT_1: [first subject line option]
SUBJECT_2: [second subject line option]
SUBJECT_3: [third subject line option]
BODY:
[email body here]`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} ${err}`)
  }

  const data = await response.json()
  const text = data.content[0]?.text || ''

  // Parse response
  const subjects = []
  const subjectMatches = text.match(/SUBJECT_[123]:\s*(.+)/g)
  if (subjectMatches) {
    subjectMatches.forEach(m => {
      const line = m.replace(/SUBJECT_[123]:\s*/, '').trim()
      subjects.push(line)
    })
  }

  const bodyMatch = text.match(/BODY:\s*([\s\S]+)$/i)
  const body = bodyMatch ? bodyMatch[1].trim() : text

  return { subjects, body }
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════
export async function POST(request) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { lead_id } = await request.json()

  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
  }

  try {
    // Fetch lead data
    const [leadResp, ownerResp, scoreResp] = await Promise.all([
      adminSupabase.from('leads').select('*').eq('id', lead_id).single(),
      adminSupabase.from('owners').select('*').eq('lead_id', lead_id).single(),
      adminSupabase.from('scores').select('score,reasoning').eq('lead_id', lead_id).order('id', { ascending: false }).limit(1).single(),
    ])

    if (!leadResp.data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Agent 1: Profile the lead
    const profile = profileLead(leadResp.data, ownerResp.data, scoreResp.data)

    // Fetch angle performance for this project type + market
    const { data: anglePerf } = await adminSupabase
      .from('angle_performance')
      .select('angle,approved_clean,approved_edited,rejected,times_used')
      .eq('lead_profile_type', profile.project_type)
      .eq('market', profile.market)

    // Agent 2: Select the angle (perf-aware)
    const angle = selectAngle(profile, anglePerf || [])

    // Load voice profile for this contractor (if exists)
    const { data: voiceProfile } = await adminSupabase
      .from('voice_profiles')
      .select('*')
      .eq('contractor_id', authUser.id)
      .single()

    // Analyze subject line preferences (after 20+ selections)
    const { data: subjectHistory } = await adminSupabase
      .from('draft_memory')
      .select('subject_line,lead_profile')
      .eq('contractor_id', authUser.id)
      .not('subject_line', 'is', null)
      .in('status', ['approved_clean', 'approved_edited'])
      .limit(50)

    let subjectPreference = null
    if (subjectHistory && subjectHistory.length >= 20) {
      // Analyze patterns: question vs statement vs action
      let questions = 0, statements = 0, action = 0
      subjectHistory.forEach(s => {
        const sub = s.subject_line || ''
        if (sub.includes('?')) questions++
        else if (sub.match(/^(your|the|a)\s/i)) statements++
        else action++
      })
      const total = questions + statements + action
      if (questions / total > 0.5) subjectPreference = 'This contractor prefers question-style subject lines (e.g. "Ready to start your rebuild?")'
      else if (statements / total > 0.5) subjectPreference = 'This contractor prefers descriptive subject lines (e.g. "Your Marquette St rebuild project")'
      else if (action / total > 0.5) subjectPreference = 'This contractor prefers action-oriented subject lines (e.g. "Let\'s talk about your project")'
    }

    // Agent 3-5: Write the draft
    const draft = await writeDraft(profile, angle, voiceProfile, subjectPreference)

    // Save to drafts table
    const { data: savedDraft, error: draftError } = await adminSupabase
      .from('drafts')
      .insert({
        lead_id,
        subject: draft.subjects[0] || 'Outreach',
        body: draft.body,
        status: 'pending_review',
        channel: 'email',
      })
      .select()
      .single()

    if (draftError) {
      console.error('Draft save error:', draftError)
      return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
    }

    // Save to draft_memory for learning
    await adminSupabase.from('draft_memory').insert({
      draft_id: savedDraft.id,
      contractor_id: authUser.id,
      lead_id,
      lead_profile: { ...profile, all_subjects: draft.subjects },
      angle: angle.angle,
      subject_line: draft.subjects[0],
      original_body: draft.body,
      status: 'created',
    })

    // Track angle usage
    const { data: existingAngle } = await adminSupabase
      .from('angle_performance')
      .select('id,times_used')
      .eq('angle', angle.angle)
      .eq('lead_profile_type', profile.project_type)
      .eq('market', profile.market)
      .single()

    if (existingAngle) {
      await adminSupabase.from('angle_performance')
        .update({ times_used: existingAngle.times_used + 1, updated_at: new Date().toISOString() })
        .eq('id', existingAngle.id)
    } else {
      await adminSupabase.from('angle_performance').insert({
        angle: angle.angle,
        lead_profile_type: profile.project_type,
        market: profile.market,
        times_used: 1,
      })
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: savedDraft.id,
        lead_id: lead_id,
        subjects: draft.subjects,
        body: draft.body,
        angle: angle.angle,
        profile: {
          project_type: profile.project_type_label,
          budget_tier: profile.budget_tier,
          urgency: profile.urgency,
          has_contractor: profile.has_contractor,
        },
      },
    })

  } catch (err) {
    console.error('Draft error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
