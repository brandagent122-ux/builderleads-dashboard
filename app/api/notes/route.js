import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-check'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('lead_id')
  if (!leadId) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

  const { data } = await adminSupabase
    .from('lead_notes')
    .select('id,note,created_at,updated_at')
    .eq('user_id', user.id)
    .eq('lead_id', parseInt(leadId))
    .order('created_at', { ascending: false })

  return NextResponse.json({ notes: data || [] })
}

export async function POST(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { lead_id, note } = await request.json()
  if (!lead_id || !note?.trim()) {
    return NextResponse.json({ error: 'lead_id and note required' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('lead_notes')
    .insert({ user_id: user.id, lead_id: parseInt(lead_id), note: note.trim() })
    .select('id,note,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function DELETE(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const noteId = searchParams.get('id')
  if (!noteId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await adminSupabase
    .from('lead_notes')
    .delete()
    .eq('id', parseInt(noteId))
    .eq('user_id', user.id)

  return NextResponse.json({ deleted: true })
}

export async function PATCH(request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id, note } = await request.json()
  if (!id || !note?.trim()) {
    return NextResponse.json({ error: 'id and note required' }, { status: 400 })
  }

  await adminSupabase
    .from('lead_notes')
    .update({ note: note.trim(), updated_at: new Date().toISOString() })
    .eq('id', parseInt(id))
    .eq('user_id', user.id)

  return NextResponse.json({ updated: true })
}
