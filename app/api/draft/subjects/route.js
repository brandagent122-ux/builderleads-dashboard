import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids')
  if (!idsParam) {
    return NextResponse.json({ subjects: {} })
  }

  const draftIds = idsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
  if (draftIds.length === 0) {
    return NextResponse.json({ subjects: {} })
  }

  try {
    const { data: memories } = await adminSupabase
      .from('draft_memory')
      .select('draft_id,lead_profile')
      .in('draft_id', draftIds)

    const subjects = {}
    if (memories) {
      memories.forEach(m => {
        const allSubjects = m.lead_profile?.all_subjects
        if (allSubjects && Array.isArray(allSubjects) && allSubjects.length > 1) {
          subjects[m.draft_id] = allSubjects
        }
      })
    }

    return NextResponse.json({ subjects })
  } catch (err) {
    console.error('[Subjects] Error:', err)
    return NextResponse.json({ subjects: {} })
  }
}
