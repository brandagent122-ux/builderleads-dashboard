import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Extract access token from request (tries Authorization header, then Supabase cookie)
function extractToken(request) {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ') && authHeader.length > 10) {
    return authHeader.replace('Bearer ', '')
  }

  // 2. Check Supabase auth cookies
  const cookieHeader = request.headers.get('cookie') || ''

  // Supabase JS v2 stores tokens in sb-{ref}-auth-token cookie
  // The cookie value is a JSON-encoded array or object
  const patterns = [
    /sb-[^=]+-auth-token=([^;]+)/,
    /sb-[^=]+-auth-token\.0=([^;]+)/,
  ]

  for (const pattern of patterns) {
    const match = cookieHeader.match(pattern)
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1])
        // Could be a JSON array like [{"access_token":"..."}] or a base64 encoded token
        if (decoded.startsWith('[') || decoded.startsWith('{')) {
          const parsed = JSON.parse(decoded)
          if (Array.isArray(parsed)) {
            return parsed[0]?.access_token || parsed[0]?.token || null
          }
          return parsed.access_token || parsed.token || null
        }
        // Might be a raw token or base64 chunk
        if (decoded.startsWith('base64-')) {
          // Supabase v2.x chunked cookies - need to reassemble
          const chunks = []
          let i = 0
          while (true) {
            const chunkMatch = cookieHeader.match(new RegExp(`sb-[^=]+-auth-token\\.${i}=([^;]+)`))
            if (!chunkMatch) break
            chunks.push(decodeURIComponent(chunkMatch[1]))
            i++
          }
          if (chunks.length > 0) {
            const full = chunks.join('')
            const clean = full.replace(/^base64-/, '')
            try {
              const json = JSON.parse(atob(clean))
              return json.access_token || null
            } catch {
              return null
            }
          }
        }
        return decoded
      } catch {}
    }
  }

  // 3. Try chunked cookie format (sb-xxx-auth-token.0, .1, .2...)
  const chunkPattern = /sb-([^-]+)-auth-token\.0=([^;]+)/
  const chunkMatch = cookieHeader.match(chunkPattern)
  if (chunkMatch) {
    const ref = chunkMatch[1]
    const chunks = []
    let i = 0
    while (true) {
      const cm = cookieHeader.match(new RegExp(`sb-${ref}-auth-token\\.${i}=([^;]+)`))
      if (!cm) break
      chunks.push(decodeURIComponent(cm[1]))
      i++
    }
    if (chunks.length > 0) {
      try {
        const full = chunks.join('')
        const clean = full.replace(/^base64-/, '')
        const json = JSON.parse(atob(clean))
        return json.access_token || null
      } catch {}
    }
  }

  return null
}

// Verify the caller is authenticated, returns user or null
export async function getAuthUser(request) {
  const token = extractToken(request)
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
