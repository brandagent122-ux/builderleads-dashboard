import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  const { data, error } = await sb
    .from('markets')
    .select('id,slug,name,zips,fire_filter,color,active')
    .eq('active', true)
    .order('id')

  if (error) {
    return NextResponse.json({ markets: [] })
  }

  return NextResponse.json({ markets: data })
}
