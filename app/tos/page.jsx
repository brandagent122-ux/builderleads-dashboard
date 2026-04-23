'use client'
import { useState, useEffect } from 'react'
import { supabase, acceptTOS } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TOSPage() {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setUserId(session.user.id)
    }
    getUser()
  }, [])

  async function handleAccept() {
    if (!agreed || !userId) return
    setLoading(true)
    await acceptTOS(userId)
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--page, #141416)',
    }}>
      <div style={{
        width: 600,
        maxHeight: '85vh',
        padding: 40,
        borderRadius: 24,
        background: 'var(--stage, #1B1B1F)',
        boxShadow: '8px 8px 20px rgba(0,0,0,0.5), -6px -6px 16px rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--ember, #FF7A3D)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#000',
          }}>B</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>BuilderLeads</div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>Terms of Service</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2, #8B8B96)', marginBottom: 20 }}>Please read and accept before continuing</div>

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 24,
          borderRadius: 16,
          background: 'var(--card-sunk, #19191D)',
          marginBottom: 24,
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--ink-1, #B8B8BF)',
          maxHeight: '45vh',
        }}>
          <p style={{ fontWeight: 700, color: '#fff', marginBottom: 12 }}>Lead Buyer Agreement</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>1. Platform Access</p>
          <p>RU4REELZ LLC ("Provider") grants you access to the BuilderLeads platform, a permit intelligence dashboard displaying publicly available property and permit data within your subscribed territory and trade vertical.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>2. Contact Information</p>
          <p>Contact information (owner name, phone number, email address) is provided by a third-party data provider and is NOT collected, stored, or owned by Provider. Contact data is retrieved in real-time at your request through a third-party skip trace service. Provider acts solely as a pass-through and does not maintain a database of personal contact information. Provider does not guarantee accuracy or completeness of contact information.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>3. Your Responsibilities</p>
          <p>By unlocking and using contact information, you agree to:</p>
          <p>a) Comply with the Telephone Consumer Protection Act (TCPA). You will NOT call any phone number flagged as "DNC" (Do Not Call). Violations may result in fines of $500 to $1,500 per call.</p>
          <p>b) Comply with the CAN-SPAM Act for all email outreach. Include your business address, identify messages as commercial, provide a working unsubscribe mechanism, and honor opt-out requests within 10 business days.</p>
          <p>c) NOT use auto-dialers, robocalls, pre-recorded messages, or mass unsolicited text messages.</p>
          <p>d) NOT resell, redistribute, share, or transfer contact information to any third party.</p>
          <p>e) Immediately cease contact with any individual who requests to not be contacted.</p>
          <p>f) Use contact information solely for legitimate business outreach related to your licensed trade services.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>4. Data Privacy</p>
          <p>Provider does not store your unlocked contact data permanently. You acknowledge that California Consumer Privacy Act (CCPA) obligations apply to any personal information you receive and store.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>5. Indemnification</p>
          <p>You agree to indemnify, defend, and hold harmless Provider, RU4REELZ LLC, its owners, officers, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses arising from your use of contact information, your violation of TCPA, CAN-SPAM, CCPA, or any other applicable law, and any outreach or contact you make with individuals identified through the platform.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>6. Subscription and Payment</p>
          <p>You agree to the subscription tier selected at signup. Unused credits do not roll over. Refunds are not provided for unused credits or subscription time.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>7. Termination</p>
          <p>Either party may terminate with 30 days written notice. Provider may terminate immediately if you violate any terms. Upon termination, you must destroy all contact information obtained through the platform.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>8. Limitation of Liability</p>
          <p>Provider's total liability shall not exceed the amount paid by you in the three (3) months preceding any claim. Provider is not liable for any indirect, incidental, or consequential damages.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 16 }}>9. Governing Law</p>
          <p>This Agreement shall be governed by the laws of the State of California. Any disputes shall be resolved in the courts of Los Angeles County, California.</p>
        </div>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          cursor: 'pointer',
          fontSize: 14,
          color: '#fff',
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ width: 20, height: 20, accentColor: 'var(--ember, #FF7A3D)', cursor: 'pointer' }}
          />
          I have read and agree to the Terms of Service and Lead Buyer Agreement
        </label>

        <button
          onClick={handleAccept}
          disabled={!agreed || loading}
          className="btn-ember"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 600,
            cursor: !agreed || loading ? 'not-allowed' : 'pointer',
            opacity: !agreed || loading ? 0.4 : 1,
          }}
        >
          {loading ? 'Processing...' : 'Accept and Continue'}
        </button>
      </div>
    </div>
  )
}
