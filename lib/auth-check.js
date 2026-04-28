import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Verify the caller is authenticated, returns user or null
export async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization') || ''
  const cookieHeader = request.headers.get('cookie') || ''

  // Try Bearer token first
  let token = authHeader.replace('Bearer ', '')

  // If no Bearer token, try to extract from Supabase auth cookie
  if (!token) {
    const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1])
        const parsed = JSON.parse(decoded)
        token = parsed?.access_token || parsed?.[0]?.access_token || ''
      } catch {}
    }
  }

  if (!token) return null

  const { data: { user }, error } = await adminSupabase.auth.getUser(token)
  if (error || !user) return null

  return user
}

// Verify the caller is an admin, returns user or null
export async function requireAdmin(request) {
  const user = await getAuthUser(request)
  if (!user) return null

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return null

  return user
}
