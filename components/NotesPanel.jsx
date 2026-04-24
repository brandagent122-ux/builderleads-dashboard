'use client'
import { useState, useEffect } from 'react'
import { getSession } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

export default function NotesPanel({ leadId, address }) {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function getHeaders() {
    const session = await getSession()
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }
  }

  async function loadNotes() {
    const h = await getHeaders()
    const resp = await fetch(`/api/notes?lead_id=${leadId}`, { headers: h })
    const data = await resp.json()
    setNotes(data.notes || [])
  }

  useEffect(() => { loadNotes() }, [leadId])

  async function handleAdd() {
    if (!newNote.trim() || saving) return
    setSaving(true)
    const h = await getHeaders()
    const resp = await fetch('/api/notes', {
      method: 'POST', headers: h,
      body: JSON.stringify({ lead_id: leadId, note: newNote.trim() }),
    })
    const data = await resp.json()
    if (data.note) {
      setNotes([data.note, ...notes])
      setNewNote('')
      logActivity('note_added', address, leadId)
    }
    setSaving(false)
  }

  async function handleDelete(noteId) {
    const h = await getHeaders()
    await fetch(`/api/notes?id=${noteId}`, { method: 'DELETE', headers: h })
    setNotes(notes.filter(n => n.id !== noteId))
  }

  function timeAgo(date) {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{
      background: 'var(--card, #212126)', borderRadius: 16, padding: 20,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div className="font-mono text-[10px] tracking-wider mb-4" style={{ color: '#8B8B96' }}>MY NOTES</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }}
          placeholder="Add a note about this lead..."
          rows={2}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12, fontSize: 13,
            background: 'var(--card-sunk, #19191D)', border: '1px solid rgba(255,255,255,0.06)',
            color: '#f0f0f0', resize: 'none', outline: 'none',
            fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newNote.trim() || saving}
          style={{
            padding: '10px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: newNote.trim() ? '#FF7A3D' : 'rgba(255,122,61,0.2)',
            color: newNote.trim() ? '#000' : '#FF7A3D',
            border: 'none', cursor: newNote.trim() ? 'pointer' : 'default',
            alignSelf: 'flex-end', opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      {notes.length === 0 ? (
        <div style={{ fontSize: 12, color: '#555560', padding: 8 }}>No notes yet. Add one above.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map(n => (
            <div key={n.id} style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--card-sunk, #19191D)',
              border: '1px solid rgba(255,255,255,0.03)',
            }}>
              <div style={{ fontSize: 13, color: '#d0d0d5', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.note}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span className="font-mono" style={{ fontSize: 10, color: '#555560' }}>{timeAgo(n.created_at)}</span>
                <button
                  onClick={() => handleDelete(n.id)}
                  style={{ fontSize: 10, color: '#555560', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
