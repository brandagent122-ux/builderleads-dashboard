'use client'

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--page, #141416)',
      display: 'flex', justifyContent: 'center', padding: '40px 20px',
    }}>
      <div style={{
        width: 700, maxWidth: '100%',
        padding: 40, borderRadius: 24,
        background: 'var(--stage, #1B1B1F)',
        boxShadow: '8px 8px 20px rgba(0,0,0,0.5), -6px -6px 16px rgba(255,255,255,0.02)',
      }}>
        <a href="/login" style={{ fontSize: 12, color: '#FF7A3D', textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>&larr; Back</a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#FF7A3D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#000',
          }}>B</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>BuilderLeads</div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Privacy Policy</h1>
        <p style={{ fontSize: 12, color: '#555560', marginBottom: 24 }}>Last updated: April 24, 2026</p>

        <div style={{
          padding: 24, borderRadius: 16,
          background: 'var(--card-sunk, #19191D)',
          fontSize: 13, lineHeight: 1.8,
          color: 'var(--ink-1, #B8B8BF)',
          maxHeight: '70vh', overflow: 'auto',
        }}>
          <p style={{ fontWeight: 700, color: '#fff', marginBottom: 12 }}>BuilderLeads Privacy Policy</p>
          <p>BuilderLeads is operated by RU4REELZ LLC ("we," "us," or "our"). This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information. This policy applies to all users of the BuilderLeads platform at builderleads.ru4reelz.com.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>1. Information We Collect</p>
          <p><strong style={{ color: '#ddd' }}>Account Information:</strong> When you create an account, we collect your email address and an encrypted password. If provided by your account administrator, we may also store your company name, trade specialty, and assigned territory (zip codes).</p>
          <p><strong style={{ color: '#ddd' }}>Usage Data:</strong> We record which leads you view, unlock timestamps, and credit usage for billing and platform administration purposes.</p>
          <p><strong style={{ color: '#ddd' }}>TOS Acceptance Records:</strong> When you accept our Terms of Service, we record the timestamp, your IP address, browser user agent, and the TOS version accepted.</p>
          <p><strong style={{ color: '#ddd' }}>Cookies:</strong> We use strictly functional cookies for authentication (Supabase session cookies). We do NOT use tracking cookies, analytics cookies, advertising cookies, or any third-party tracking technologies.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>2. Information We Do NOT Collect or Store</p>
          <p><strong style={{ color: '#ddd' }}>Contact Data:</strong> Owner names, phone numbers, email addresses, and mailing addresses displayed through our platform are retrieved in real-time from a third-party skip trace provider (Tracerfy) at your request. This data is NOT stored in our database. It is displayed on screen, temporarily cached in your browser for up to 24 hours, and then automatically deleted. We do not maintain a database of personal contact information.</p>
          <p><strong style={{ color: '#ddd' }}>Financial Information:</strong> We do not collect credit card numbers or bank account information directly. Payment processing is handled by third-party providers.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>3. How We Use Your Information</p>
          <p>We use your account information to: provide access to the BuilderLeads platform, manage your subscription tier and territory, track credit usage for billing, enforce the Terms of Service, and communicate important platform updates.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>4. Property and Permit Data</p>
          <p>BuilderLeads aggregates publicly available data from government sources including the Los Angeles Department of Building and Safety (LADBS), LA County Assessor, CAL FIRE, ZIMAS, and FEMA. This data is public record. We enrich and score this data using AI to identify high-priority properties for contractor outreach. No private or proprietary data sources are used for property/permit information.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>5. Third-Party Services</p>
          <p>We use the following third-party services:</p>
          <p>- <strong style={{ color: '#ddd' }}>Supabase:</strong> Database and authentication (PostgreSQL hosted in the United States)</p>
          <p>- <strong style={{ color: '#ddd' }}>Vercel:</strong> Website hosting and deployment</p>
          <p>- <strong style={{ color: '#ddd' }}>Tracerfy:</strong> Third-party skip trace provider for contact information (pass-through only, data not stored)</p>
          <p>- <strong style={{ color: '#ddd' }}>Anthropic (Claude):</strong> AI scoring and analysis of permit data (no personal data is sent to AI services)</p>
          <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>6. Data Retention</p>
          <p>Account information is retained for the duration of your subscription and for 90 days after termination. Unlock records (which leads you accessed, timestamps, credits used) are retained for billing and audit purposes. Contact data from Tracerfy is never stored on our servers and auto-expires from your browser cache after 24 hours.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>7. Your California Privacy Rights (CalOPPA / CCPA)</p>
          <p>If you are a California resident, you have the right to: know what personal information we collect about you, request deletion of your personal information, opt out of the sale of personal information (we do not sell personal information), and not be discriminated against for exercising your privacy rights. To exercise any of these rights, contact us at freddy@ru4reelz.com.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>8. Data Security</p>
          <p>We implement industry-standard security measures including: encrypted passwords, row-level security on all database tables, server-side DNC filtering, authenticated API routes, and HTTPS encryption on all connections. However, no method of transmission over the Internet is 100% secure.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>9. Children's Privacy</p>
          <p>BuilderLeads is a business-to-business platform. We do not knowingly collect information from individuals under 18 years of age.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>10. Changes to This Policy</p>
          <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email or platform notification. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>11. Contact Us</p>
          <p>For privacy questions or requests, contact:</p>
          <p>RU4REELZ LLC<br/>Email: freddy@ru4reelz.com<br/>Los Angeles, California</p>
        </div>
      </div>
    </div>
  )
}
