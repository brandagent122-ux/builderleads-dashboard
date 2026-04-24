'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getLeadDetail } from '@/lib/supabase'

const CACHE_KEY = 'bl_contact_cache'

function getCachedContact(leadId) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    return cache[leadId] || null
  } catch { return null }
}

function formatPhone(num) {
  if (!num || num.length !== 10) return num
  return `(${num.slice(0,3)}) ${num.slice(3,6)}-${num.slice(6)}`
}

function formatDate(d) {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

export default function PrintLeadPage() {
  const params = useParams()
  const [lead, setLead] = useState(null)
  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getLeadDetail(params.id)
      setLead(data)

      const cached = getCachedContact(parseInt(params.id))
      if (cached) setContact(cached)

      setLoading(false)

      // Auto-open print dialog after a short delay
      setTimeout(() => window.print(), 800)
    }
    load()
  }, [params.id])

  if (loading) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading...</div>
  if (!lead) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Lead not found</div>

  const totalPermits = 1 + (lead.stackedPermits?.length || 0)
  const scoreColor = lead.score >= 85 ? '#E8561D' : lead.score >= 75 ? '#E87A3D' : lead.score >= 50 ? '#D4A017' : '#888'

  const dmg = lead.dins_damage || 'Unknown'
  const dmgLabel = dmg.includes('Destroyed') ? 'DESTROYED' : dmg.includes('Major') ? 'MAJOR' : dmg.includes('Minor') ? 'MINOR' : dmg.includes('Affected') ? 'AFFECTED' : ''
  const dmgColor = dmg.includes('Destroyed') ? '#DC2626' : dmg.includes('Major') ? '#EA580C' : dmg.includes('Minor') ? '#CA8A04' : '#2563EB'

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 0.5in; size: letter; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; }
      `}</style>

      {/* Print / Close bar */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: '#1B1B1F', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #333',
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => window.print()} style={{
            background: '#FF7A3D', color: '#fff', border: 'none', padding: '8px 20px',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Print / Save PDF</button>
          <button onClick={() => window.close()} style={{
            background: '#333', color: '#aaa', border: 'none', padding: '8px 20px',
            borderRadius: 8, fontSize: 13, cursor: 'pointer',
          }}>Close</button>
        </div>
        <span style={{ color: '#666', fontSize: 12 }}>Use "Save as PDF" in print dialog to download</span>
      </div>

      <div style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: '#111', maxWidth: 750, margin: '0 auto',
        padding: '72px 0 40px',
        lineHeight: 1.5,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #E8561D' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#E8561D', marginBottom: 4 }}>BUILDERLEADS</div>
            <div style={{ fontSize: 9, color: '#888', letterSpacing: 1 }}>PERMIT INTELLIGENCE REPORT</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#888' }}>Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div style={{ fontSize: 9, color: '#888' }}>Lead #{lead.id}</div>
          </div>
        </div>

        {/* Score + Address */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 4 }}>{lead.address}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Pacific Palisades, CA 90272</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {dmgLabel && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '3px 8px', borderRadius: 4, background: dmgColor + '15', color: dmgColor, border: `1px solid ${dmgColor}30` }}>{dmgLabel}</span>
              )}
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, padding: '3px 8px', borderRadius: 4, background: '#f0f0f0', color: '#555' }}>{lead.permit_type}</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, padding: '3px 8px', borderRadius: 4, background: '#f0f0f0', color: '#555' }}>{lead.permit_stage}</span>
              {totalPermits > 1 && <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, padding: '3px 8px', borderRadius: 4, background: '#E8561D15', color: '#E8561D' }}>{totalPermits} PERMITS STACKED</span>}
              {lead.owner_occupied && <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, padding: '3px 8px', borderRadius: 4, background: '#f0f0f0', color: '#555' }}>OWNER-OCCUPIED</span>}
              {lead.contractor_name === 'None listed' && <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, padding: '3px 8px', borderRadius: 4, background: '#DC262615', color: '#DC2626' }}>NO CONTRACTOR</span>}
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              border: `4px solid ${scoreColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: scoreColor,
            }}>{lead.score}</div>
            <div style={{ fontSize: 9, color: '#888', marginTop: 4 }}>SCORE / 100</div>
          </div>
        </div>

        {/* Contact info if cached */}
        {contact && contact.length > 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#16a34a', marginBottom: 8 }}>OWNER CONTACT</div>
            {contact.map((person, i) => (
              <div key={i} style={{ marginBottom: i < contact.length - 1 ? 12 : 0 }}>
                {person.full_name && <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{person.full_name}</div>}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
                  {person.phones && person.phones.length > 0 && (
                    <div>
                      {person.phones.map((p, j) => (
                        <div key={j} style={{ color: '#333' }}>
                          {formatPhone(p.number)} <span style={{ fontSize: 10, color: '#888' }}>{p.type}{p.dnc ? ' (DNC)' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {person.emails && person.emails.length > 0 && (
                    <div>
                      {person.emails.map((e, j) => <div key={j} style={{ color: '#333' }}>{e.email}</div>)}
                    </div>
                  )}
                  {person.mailing_address && person.mailing_address.street && (
                    <div style={{ color: '#555', fontSize: 12 }}>
                      Mailing: {person.mailing_address.street}, {person.mailing_address.city}, {person.mailing_address.state} {person.mailing_address.zip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Two-column grid: Property + Fire */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Section title="Property Details">
            <Grid>
              <Cell label="BEDROOMS" value={lead.beds || '-'} />
              <Cell label="BATHROOMS" value={lead.baths || '-'} />
              <Cell label="SQUARE FEET" value={lead.sqft ? lead.sqft.toLocaleString() : '-'} />
              <Cell label="YEAR BUILT" value={lead.year_built || '-'} />
              <Cell label="LOT SIZE" value={lead.lot_size_sqft ? `${lead.lot_size_sqft.toLocaleString()} sqft` : '-'} />
              <Cell label="ASSESSED VALUE" value={lead.assessor_value ? `$${(lead.assessor_value / 1e6).toFixed(2)}M` : '-'} />
            </Grid>
          </Section>

          <Section title="Fire Damage Intel">
            <Grid>
              <Cell label="DINS CLASSIFICATION" value={dmgLabel || '-'} />
              <Cell label="STRUCTURE TYPE" value={lead.dins_structure_type || '-'} />
              <Cell label="FIRE ZONE" value={lead.fire_zone_match ? 'Inside Perimeter' : 'Outside'} />
              <Cell label="DISTANCE" value={lead.fire_zone_distance_ft != null ? `${Math.round(lead.fire_zone_distance_ft)} ft` : '-'} />
              <Cell label="DINS ACCURACY" value={lead.dins_match_distance_m != null ? `${Math.round(lead.dins_match_distance_m)}m` : '-'} />
              <Cell label="DAMAGE FLAG" value={lead.fire_damage_flag || '-'} />
            </Grid>
          </Section>
        </div>

        {/* Two-column: Zoning + Neighborhood */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Section title="Zoning & Buildability">
            <Grid>
              <Cell label="ZONE CODE" value={lead.zoning || '-'} />
              <Cell label="ZONE DESC" value={lead.zoning_desc || '-'} />
              <Cell label="MAX FAR" value={lead.max_far != null ? lead.max_far : '-'} />
              <Cell label="MAX BUILDABLE" value={lead.max_far && lead.lot_size_sqft ? `${Math.round(lead.max_far * lead.lot_size_sqft).toLocaleString()} sqft` : '-'} />
              <Cell label="HILLSIDE ZONE" value={lead.hillside_zone === true ? 'Yes' : lead.hillside_zone === false ? 'No' : '-'} />
              <Cell label="FLOOD ZONE" value={lead.flood_zone ? `${lead.flood_zone}${lead.flood_zone === 'X' ? ' (Minimal Risk)' : lead.flood_zone === 'AE' ? ' (High Risk)' : ''}` : '-'} />
            </Grid>
          </Section>

          <Section title="Neighborhood Activity">
            <Grid>
              <Cell label="PERMITS WITHIN 500FT" value={lead.neighbor_permits_500ft ?? '-'} />
              <Cell label="SAME STREET PERMITS" value={lead.street_permit_count ?? '-'} />
              <Cell label="CONTRACTOR" value={lead.contractor_name || '-'} />
              <Cell label="LICENSE #" value={lead.contractor_license || '-'} />
            </Grid>
          </Section>
        </div>

        {/* Primary Permit */}
        <Section title="Primary Permit" full>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 12 }}>
            <Cell label="PERMIT NUMBER" value={lead.permit_number || '-'} />
            <Cell label="FILED" value={formatDate(lead.permit_filed_at)} />
            <Cell label="ISSUED" value={formatDate(lead.permit_issued_at)} />
            <Cell label="PERMIT VALUE" value={lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'} />
          </div>
        </Section>

        {/* Permit Stack */}
        {lead.stackedPermits && lead.stackedPermits.length > 0 && (
          <Section title={`Permit Stack at This Address (${totalPermits} Total)`} full>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <th style={th}>Type</th>
                  <th style={th}>Permit #</th>
                  <th style={th}>Filed</th>
                  <th style={th}>Issued</th>
                  <th style={th}>Value</th>
                  <th style={th}>Stage</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee', background: '#FFF7ED' }}>
                  <td style={td}><strong>{lead.permit_type}</strong></td>
                  <td style={td}>{lead.permit_number}</td>
                  <td style={td}>{formatDate(lead.permit_filed_at)}</td>
                  <td style={td}>{formatDate(lead.permit_issued_at)}</td>
                  <td style={td}>{lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'}</td>
                  <td style={td}><strong style={{ color: '#E8561D' }}>{lead.permit_stage}</strong></td>
                </tr>
                {lead.stackedPermits.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}>{p.permit_type}</td>
                    <td style={td}>{p.permit_number}</td>
                    <td style={td}>{formatDate(p.permit_filed_at)}</td>
                    <td style={td}>{formatDate(p.permit_issued_at)}</td>
                    <td style={td}>{p.estimated_value ? `$${p.estimated_value.toLocaleString()}` : '-'}</td>
                    <td style={td}>{p.permit_stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Inspection History */}
        {lead.inspections && lead.inspections.length > 0 && (
          <Section title="Inspection History" full>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <th style={th}>Type</th>
                  <th style={th}>Date</th>
                  <th style={th}>Result</th>
                  <th style={th}>Inspector</th>
                </tr>
              </thead>
              <tbody>
                {lead.inspections.map((insp, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}>{insp.inspection_type || '-'}</td>
                    <td style={td}>{formatDate(insp.inspection_date)}</td>
                    <td style={{ ...td, color: insp.result?.toUpperCase().includes('PASS') ? '#16a34a' : insp.result?.toUpperCase().includes('FAIL') ? '#dc2626' : '#555', fontWeight: 600 }}>{insp.result || '-'}</td>
                    <td style={td}>{insp.inspector || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* AI Reasoning */}
        {lead.reasoning && (
          <Section title="AI Score Reasoning" full>
            <p style={{ fontSize: 12, color: '#333', lineHeight: 1.7 }}>{lead.reasoning}</p>
          </Section>
        )}

        {/* Permit Description */}
        {lead.permit_description && (
          <Section title="Permit Description (LADBS)" full>
            <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, fontFamily: 'monospace' }}>{lead.permit_description}</p>
          </Section>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999' }}>
          <span>BuilderLeads by RU4REELZ | freddy@ru4reelz.com</span>
          <span>Lead #{lead.id} | {lead.address}</span>
        </div>
      </div>
    </>
  )
}

const th = { textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#888', textTransform: 'uppercase' }
const td = { padding: '6px 8px', color: '#333' }

function Section({ title, children, full }) {
  return (
    <div style={{ marginBottom: full ? 16 : 0, border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: '#f9f9f9', padding: '8px 12px', borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#555', textTransform: 'uppercase' }}>{title}</div>
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  )
}

function Grid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>{children}</div>
}

function Cell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, color: '#999', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#222' }}>{value}</div>
    </div>
  )
}
