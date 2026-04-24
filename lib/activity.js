import { getSession } from '@/lib/supabase'

export async function logActivity(action, details = null, leadId = null) {
  try {
    const session = await getSession()
    if (!session) return

    fetch('/api/activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action,
        details,
        lead_id: leadId,
      }),
    }).catch(() => {})
  } catch {}
}
