'use client'
export default function ReportsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
      <p className="text-sm text-slate-500 mt-1">Export and download lead reports</p>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="card card-accent p-6">
          <div className="text-sm font-semibold text-white mb-2">Top leads report</div>
          <div className="text-xs text-slate-500 mb-4">PDF report of your highest scored leads with property details and damage classification</div>
          <div className="btn-secondary text-xs inline-block">Coming soon</div>
        </div>
        <div className="card card-accent p-6">
          <div className="text-sm font-semibold text-white mb-2">CSV export</div>
          <div className="text-xs text-slate-500 mb-4">Download all leads as a spreadsheet for use in your CRM or dialer</div>
          <div className="btn-secondary text-xs inline-block">Coming soon</div>
        </div>
        <div className="card card-accent p-6">
          <div className="text-sm font-semibold text-white mb-2">Trade-filtered report</div>
          <div className="text-xs text-slate-500 mb-4">Generate reports filtered by trade (HVAC, plumbing, roofing, etc.) for specific buyers</div>
          <div className="btn-secondary text-xs inline-block">Coming soon</div>
        </div>
        <div className="card card-accent p-6">
          <div className="text-sm font-semibold text-white mb-2">Weekly summary</div>
          <div className="text-xs text-slate-500 mb-4">Automated weekly email with new leads, score changes, and permit activity</div>
          <div className="btn-secondary text-xs inline-block">Coming soon</div>
        </div>
      </div>
    </div>
  )
}
