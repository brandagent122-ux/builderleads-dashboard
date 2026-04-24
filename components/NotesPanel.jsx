'use client'
import { useState, useEffect } from 'react'
import { getSession } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

export default function NotesPanel({ leadId, address }) {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
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

  function startEdit(note) {
    setEditingId(note.id)
    setEditText(note.note)
  }

  async function handleSaveEdit(noteId) {
    if (!editText.trim()) return
    const h = await getHeaders()
    await fetch('/api/notes', {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ id: noteId, note: editText.trim() }),
    })
    setNotes(notes.map(n => n.id === noteId ? { ...n, note: editText.trim() } : n))
    setEditingId(null)
    setEditText('')
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
      background: 'var(--card, #212126)', borderRadius: 14, padding: 12,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div className="font-mono text-[10px] tracking-wider mb-3" style={{ color: '#8B8B96' }}>
        MY NOTES {notes.length > 0 && `(${notes.length})`}
      </div>

      {/* Add note input */}
      <div style={{ marginBottom: 12 }}>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }}
          placeholder="Add a note..."
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 10, fontSize: 12,
            background: 'var(--card-sunk, #19191D)', border: '1px solid rgba(255,255,255,0.06)',
            color: '#f0f0f0', resize: 'none', outline: 'none',
            fontFamily: 'Inter, sans-serif', lineHeight: 1.5, boxSizing: 'border-box',
          }}
        />
        {newNote.trim() && (
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              marginTop: 6, width: '100%', padding: '6px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: '#FF7A3D', color: '#000', border: 'none', cursor: 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save note'}
          </button>
        )}
      </div>

      {/* Notes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
        {notes.map(n => (
          <div key={n.id} style={{
            padding: '8px 10px', borderRadius: 8,
            background: 'var(--card-sunk, #19191D)',
            border: '1px solid rgba(255,255,255,0.03)',
          }}>
            {editingId === n.id ? (
              <div>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 12,
                    background: '#141416', border: '1px solid #FF7A3D40',
                    color: '#f0f0f0', resize: 'none', outline: 'none',
                    fontFamily: 'Inter, sans-serif', lineHeight: 1.5, boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button onClick={() => handleSaveEdit(n.id)}
                    style={{ fontSize: 9, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)}
                    style={{ fontSize: 9, color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#d0d0d5', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.note}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span className="font-mono" style={{ fontSize: 9, color: '#555560' }}>{timeAgo(n.created_at)}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startEdit(n)}
                      style={{ fontSize: 9, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(n.id)}
                      style={{ fontSize: 9, color: '#555560', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {notes.length === 0 && (
        <div style={{ fontSize: 11, color: '#555560', textAlign: 'center', padding: 8 }}>No notes yet</div>
      )}
    </div>
  )
}
