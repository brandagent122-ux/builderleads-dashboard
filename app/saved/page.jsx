'use client'
export default function SavedLeadsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white tracking-tight">Saved Leads</h1>
      <p className="text-sm text-slate-500 mt-1">Leads you bookmarked for follow-up</p>
      <div className="card p-12 mt-6 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2e3045" strokeWidth="1.5" className="mx-auto mb-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <div className="text-sm text-slate-400 mb-2">No saved leads yet</div>
        <div className="text-xs text-slate-650">Click the star icon on any lead to save it here for quick access</div>
      </div>
    </div>
  )
}
