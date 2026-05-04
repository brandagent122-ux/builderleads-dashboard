import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ═══════════════════════════════════════
// Compute a simple word-level diff
// ═══════════════════════════════════════
function computeDiff(original, edited) {
  const origWords = original.split(/\s+/)
  const editWords = edited.split(/\s+/)
  const origSet = new Set(origWords)
  const editSet = new Set(editWords)

  const added = editWords.filter(w => !origSet.has(w))
  const removed = origWords.filter(w => !editSet.has(w))

  // Detect greeting change
  const origFirstLine = original.split('\n')[0] || ''
  const editFirstLine = edited.split('\n')[0] || ''
  const greetingChanged = origFirstLine.trim() !== editFirstLine.trim()

  // Detect signoff change
  const origLastLines = original.trim().split('\n').slice(-3).join('\n')
  const editLastLines = edited.trim().split('\n').slice(-3).join('\n')
  const signoffChanged = origLastLines.trim() !== editLastLines.trim()

  // Detect CTA change (last sentence before signoff)
  const origSentences = original.replace(/\n/g, ' ').split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  const editSentences = edited.replace(/\n/g, ' ').split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  const ctaChanged = origSentences.length > 1 && editSentences.length > 1 &&
    origSentences[origSentences.length - 2] !== editSentences[editSentences.length - 2]

  return {
    words_added: added.slice(0, 50),
    words_removed: removed.slice(0, 50),
    greeting_changed: greetingChanged,
    new_greeting: greetingChanged ? editFirstLine.trim() : null,
    signoff_changed: signoffChanged,
    new_signoff: signoffChanged ? edited.trim().split('\n').slice(-2).join('\n').trim() : null,
    cta_changed: ctaChanged,
    edit_distance: added.length + removed.length,
    original_length: origWords.length,
    edited_length: editWords.length,
  }
}

// ═══════════════════════════════════════
// Auto-update voice_profiles after 10+ edits
// ═══════════════════════════════════════
async function maybeUpdateVoiceProfile(contractorId) {
  // Count edits for this contractor
  const { data: edits } = await adminSupabase
    .from('draft_memory')
    .select('edit_diff,edited_body')
    .eq('contractor_id', contractorId)
    .not('edit_diff', 'is', null)
    .order('id', { ascending: false })
    .limit(50)

  if (!edits || edits.length < 10) return

  // Aggregate patterns from diffs
  const allAdded = {}
  const allRemoved = {}
  let greetings = []
  let signoffs = []
  let ctaChanges = 0
  let totalFormality = 0

  edits.forEach(e => {
    const diff = typeof e.edit_diff === 'string' ? JSON.parse(e.edit_diff) : (e.edit_diff || {})

    // Count word frequency
    ;(diff.words_added || []).forEach(w => {
      const lower = w.toLowerCase().replace(/[^a-z']/g, '')
      if (lower.length > 2) allAdded[lower] = (allAdded[lower] || 0) + 1
    })
    ;(diff.words_removed || []).forEach(w => {
      const lower = w.toLowerCase().replace(/[^a-z']/g, '')
      if (lower.length > 2) allRemoved[lower] = (allRemoved[lower] || 0) + 1
    })

    if (diff.greeting_changed && diff.new_greeting) greetings.push(diff.new_greeting)
    if (diff.signoff_changed && diff.new_signoff) signoffs.push(diff.new_signoff)
    if (diff.cta_changed) ctaChanges++

    // Estimate formality: longer edits with more formal words = higher formality
    const body = e.edited_body || ''
    const formalWords = ['sincerely', 'regards', 'respectfully', 'dear', 'pleased', 'appreciate', 'opportunity']
    const casualWords = ['hey', 'cheers', 'thanks', 'cool', 'awesome', 'quick', 'swing by']
    const formalCount = formalWords.filter(w => body.toLowerCase().includes(w)).length
    const casualCount = casualWords.filter(w => body.toLowerCase().includes(w)).length
    totalFormality += (formalCount - casualCount)
  })

  // Top preferred words (added 3+ times)
  const preferredWords = Object.entries(allAdded)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word)

  // Top banned words (removed 3+ times)
  const bannedWords = Object.entries(allRemoved)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word)

  // Most common greeting
  const greetingCounts = {}
  greetings.forEach(g => { greetingCounts[g] = (greetingCounts[g] || 0) + 1 })
  const topGreeting = Object.entries(greetingCounts).sort((a, b) => b[1] - a[1])[0]

  // Most common signoff
  const signoffCounts = {}
  signoffs.forEach(s => { signoffCounts[s] = (signoffCounts[s] || 0) + 1 })
  const topSignoff = Object.entries(signoffCounts).sort((a, b) => b[1] - a[1])[0]

  // Formality scale 1-10
  const avgFormality = Math.max(1, Math.min(10, 5 + Math.round(totalFormality / edits.length * 2)))

  // CTA style
  let ctaStyle = 'casual_visit'
  if (ctaChanges > edits.length * 0.5) ctaStyle = 'custom' // they change CTA a lot

  // Upsert voice profile
  const profileData = {
    contractor_id: contractorId,
    formality: avgFormality,
    greeting_style: topGreeting ? topGreeting[0] : null,
    signoff_style: topSignoff ? topSignoff[0] : null,
    preferred_words: preferredWords,
    banned_words: bannedWords,
    cta_style: ctaStyle,
    sample_count: edits.length,
    profile_data: {
      last_updated: new Date().toISOString(),
      edit_count: edits.length,
      avg_edit_distance: edits.reduce((sum, e) => {
        const d = typeof e.edit_diff === 'string' ? JSON.parse(e.edit_diff) : (e.edit_diff || {})
        return sum + (d.edit_distance || 0)
      }, 0) / edits.length,
    },
  }

  const { data: existing } = await adminSupabase
    .from('voice_profiles')
    .select('id')
    .eq('contractor_id', contractorId)
    .single()

  if (existing) {
    await adminSupabase.from('voice_profiles').update(profileData).eq('id', existing.id)
  } else {
    await adminSupabase.from('voice_profiles').insert(profileData)
  }

  console.log(`[VoiceProfile] Updated for contractor ${contractorId}: ${edits.length} edits analyzed, ${preferredWords.length} preferred words, ${bannedWords.length} banned words`)
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════
export async function POST(request) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { action, draft_id, edited_body, selected_subject, all_subjects } = body

  if (!draft_id || !action) {
    return NextResponse.json({ error: 'draft_id and action required' }, { status: 400 })
  }

  try {
    // ─── APPROVE (clean, no edits) ───
    if (action === 'approve') {
      // Update draft status
      await adminSupabase.from('drafts').update({ status: 'approved' }).eq('id', draft_id)

      // Update subject if one was selected
      if (selected_subject) {
        await adminSupabase.from('drafts').update({ subject: selected_subject }).eq('id', draft_id)
      }

      // Update draft_memory
      await adminSupabase.from('draft_memory')
        .update({ status: 'approved_clean' })
        .eq('draft_id', draft_id)

      // Update angle_performance
      const { data: mem } = await adminSupabase
        .from('draft_memory')
        .select('angle,lead_profile')
        .eq('draft_id', draft_id)
        .single()

      if (mem) {
        const profileType = mem.lead_profile?.project_type || 'unknown'
        const market = mem.lead_profile?.market || 'unknown'

        const { data: perf } = await adminSupabase
          .from('angle_performance')
          .select('id,approved_clean')
          .eq('angle', mem.angle)
          .eq('lead_profile_type', profileType)
          .eq('market', market)
          .single()

        if (perf) {
          await adminSupabase.from('angle_performance')
            .update({ approved_clean: (perf.approved_clean || 0) + 1, updated_at: new Date().toISOString() })
            .eq('id', perf.id)
        }
      }

      // Track subject selection
      if (selected_subject && all_subjects) {
        await adminSupabase.from('draft_memory')
          .update({ subject_line: selected_subject })
          .eq('draft_id', draft_id)
      }

      return NextResponse.json({ success: true, action: 'approved_clean' })
    }

    // ─── EDIT & APPROVE ───
    if (action === 'edit_approve') {
      if (!edited_body) {
        return NextResponse.json({ error: 'edited_body required for edit_approve' }, { status: 400 })
      }

      // Get original body from draft_memory
      const { data: mem } = await adminSupabase
        .from('draft_memory')
        .select('original_body,angle,lead_profile')
        .eq('draft_id', draft_id)
        .single()

      const originalBody = mem?.original_body || ''

      // Compute diff
      const diff = computeDiff(originalBody, edited_body)

      // Update draft with edited body + approved status
      const updateData = { status: 'approved', body: edited_body }
      if (selected_subject) updateData.subject = selected_subject
      await adminSupabase.from('drafts').update(updateData).eq('id', draft_id)

      // Update draft_memory with edit data
      await adminSupabase.from('draft_memory')
        .update({
          status: 'approved_edited',
          edited_body: edited_body,
          edit_diff: diff,
          subject_line: selected_subject || undefined,
        })
        .eq('draft_id', draft_id)

      // Update angle_performance
      if (mem) {
        const profileType = mem.lead_profile?.project_type || 'unknown'
        const market = mem.lead_profile?.market || 'unknown'

        const { data: perf } = await adminSupabase
          .from('angle_performance')
          .select('id,approved_edited')
          .eq('angle', mem.angle)
          .eq('lead_profile_type', profileType)
          .eq('market', market)
          .single()

        if (perf) {
          await adminSupabase.from('angle_performance')
            .update({ approved_edited: (perf.approved_edited || 0) + 1, updated_at: new Date().toISOString() })
            .eq('id', perf.id)
        }
      }

      // Auto-update voice profile if 10+ edits
      await maybeUpdateVoiceProfile(authUser.id)

      return NextResponse.json({ success: true, action: 'approved_edited', diff })
    }

    // ─── REJECT ───
    if (action === 'reject') {
      await adminSupabase.from('drafts').update({ status: 'rejected' }).eq('id', draft_id)

      await adminSupabase.from('draft_memory')
        .update({ status: 'rejected' })
        .eq('draft_id', draft_id)

      // Update angle_performance
      const { data: mem } = await adminSupabase
        .from('draft_memory')
        .select('angle,lead_profile')
        .eq('draft_id', draft_id)
        .single()

      if (mem) {
        const profileType = mem.lead_profile?.project_type || 'unknown'
        const market = mem.lead_profile?.market || 'unknown'

        const { data: perf } = await adminSupabase
          .from('angle_performance')
          .select('id,rejected')
          .eq('angle', mem.angle)
          .eq('lead_profile_type', profileType)
          .eq('market', market)
          .single()

        if (perf) {
          await adminSupabase.from('angle_performance')
            .update({ rejected: (perf.rejected || 0) + 1, updated_at: new Date().toISOString() })
            .eq('id', perf.id)
        }
      }

      return NextResponse.json({ success: true, action: 'rejected' })
    }

    // ─── SUBJECT SELECT (just tracking, no status change) ───
    if (action === 'select_subject') {
      if (!selected_subject) {
        return NextResponse.json({ error: 'selected_subject required' }, { status: 400 })
      }

      await adminSupabase.from('drafts').update({ subject: selected_subject }).eq('id', draft_id)

      await adminSupabase.from('draft_memory')
        .update({ subject_line: selected_subject })
        .eq('draft_id', draft_id)

      return NextResponse.json({ success: true, action: 'subject_selected' })
    }

    // ─── MARK SENT ───
    if (action === 'mark_sent') {
      await adminSupabase.from('drafts').update({ status: 'sent' }).eq('id', draft_id)
      await adminSupabase.from('draft_memory')
        .update({ status: 'sent' })
        .eq('draft_id', draft_id)
      return NextResponse.json({ success: true, action: 'marked_sent' })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })

  } catch (err) {
    console.error('[Learn] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
