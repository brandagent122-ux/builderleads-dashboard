'use client'

export default function TermsPage() {
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

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Terms of Service</h1>
        <p style={{ fontSize: 12, color: '#555560', marginBottom: 24 }}>Last updated: April 24, 2026</p>

        <div style={{
          padding: 24, borderRadius: 16,
          background: 'var(--card-sunk, #19191D)',
          fontSize: 13, lineHeight: 1.8,
          color: 'var(--ink-1, #B8B8BF)',
          maxHeight: '70vh', overflow: 'auto',
        }}>
          <p style={{ fontWeight: 700, color: '#fff', marginBottom: 12 }}>BuilderLeads Terms of Service</p>
          <p>These Terms of Service ("Terms") govern your use of the BuilderLeads platform operated by RU4REELZ LLC ("Provider," "we," "us"). By accessing or using BuilderLeads, you agree to be bound by these Terms.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>1. Platform Description</p>
          <p>BuilderLeads is a permit intelligence platform that aggregates publicly available building permit, property, and fire damage data for the purpose of identifying potential construction opportunities. The platform uses AI to score and rank leads for contractors and related trade professionals. BuilderLeads is a SaaS (Software as a Service) product. You are purchasing access to the platform, not the underlying data.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>2. Account Registration and Security</p>
          <p>a) You must provide accurate and complete information when creating an account.</p>
          <p>b) You are responsible for maintaining the confidentiality of your login credentials.</p>
          <p>c) You must NOT share your account credentials with any other person, employee, colleague, or entity. Each account is for a single authorized user only.</p>
          <p>d) You must notify us immediately at freddy@ru4reelz.com if you suspect unauthorized access to your account.</p>
          <p>e) We reserve the right to suspend or terminate accounts that show signs of credential sharing, including simultaneous logins from different locations.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>3. Contractor Obligations</p>
          <p>a) You represent and warrant that you hold a valid, active contractor license issued by the California Contractors State License Board (CSLB) or applicable licensing authority for your trade.</p>
          <p>b) You agree to maintain your license in good standing for the duration of your subscription.</p>
          <p>c) You agree to conduct all outreach to homeowners in a professional manner consistent with industry standards and applicable law.</p>
          <p>d) You understand that BuilderLeads provides leads, not guaranteed contracts. We make no representation that any lead will result in a signed contract or completed project.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>4. Prohibited Uses</p>
          <p>You agree NOT to:</p>
          <p>a) <strong style={{ color: '#ddd' }}>Share, resell, or redistribute</strong> any data, leads, contact information, scores, or reports obtained from BuilderLeads to any third party, including other contractors, lead generation companies, data brokers, or competing platforms.</p>
          <p>b) <strong style={{ color: '#ddd' }}>Screenshot, copy, or export</strong> platform data for the purpose of sharing it outside your own authorized use. CSV exports and printed reports are for your internal business use only.</p>
          <p>c) <strong style={{ color: '#ddd' }}>Scrape, crawl, or automate</strong> data collection from the platform using bots, scripts, or any automated means.</p>
          <p>d) <strong style={{ color: '#ddd' }}>Reverse engineer</strong> the platform, its scoring algorithms, data pipeline, or AI models.</p>
          <p>e) <strong style={{ color: '#ddd' }}>Build a competing product</strong> using data, methodologies, or insights obtained from BuilderLeads.</p>
          <p>f) <strong style={{ color: '#ddd' }}>Harass, threaten, or pressure</strong> any homeowner or property owner identified through the platform.</p>
          <p>g) <strong style={{ color: '#ddd' }}>Misrepresent your affiliation</strong> with BuilderLeads or RU4REELZ LLC when contacting homeowners. You may reference that you found public permit information, but you must not imply any endorsement or partnership with our platform.</p>
          <p>h) <strong style={{ color: '#ddd' }}>Contact homeowners flagged as DNC</strong> (Do Not Call). BuilderLeads filters DNC numbers server-side. If a number reaches you through our platform, it has been verified as clean at the time of lookup. However, DNC status can change and you are ultimately responsible for compliance.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>5. Contact Information and Compliance</p>
          <p>a) Contact information (owner names, phone numbers, email addresses) is provided by a third-party skip trace service and is NOT stored by BuilderLeads.</p>
          <p>b) You accept full responsibility for all outreach conducted using contact information obtained through the platform.</p>
          <p>c) You must comply with the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, California Consumer Privacy Act (CCPA), and all applicable federal, state, and local laws.</p>
          <p>d) Violations of TCPA can result in fines of $500 to $1,500 per call. BuilderLeads is not liable for any fines, penalties, or legal actions resulting from your outreach.</p>
          <p>e) By using the platform, you also agree to the Lead Buyer Agreement presented at first login, which contains additional obligations regarding contact data.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>6. Data Accuracy</p>
          <p>a) Property data, permit information, and fire damage classifications are sourced from public government records. We do not guarantee accuracy, completeness, or timeliness of this data.</p>
          <p>b) AI scores are generated by machine learning models and represent estimates, not guarantees. A high score does not guarantee a lead will convert to a paying customer.</p>
          <p>c) Contact information accuracy depends on third-party data providers and may contain errors, outdated information, or incorrect associations.</p>
          <p>d) You should independently verify critical information before relying on it for business decisions.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>7. Subscription, Credits, and Payment</p>
          <p>a) Access is provided on a monthly subscription basis at the tier selected by your account administrator.</p>
          <p>b) Contact unlock credits are consumed when you request contact information for a lead. Credits do not roll over between billing periods.</p>
          <p>c) Refunds are not provided for unused credits, remaining subscription time, or leads that do not result in business.</p>
          <p>d) We reserve the right to change pricing with 30 days written notice.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>8. Intellectual Property</p>
          <p>a) The BuilderLeads platform, including its design, scoring algorithms, AI models, agent pipeline architecture, and software code, is the intellectual property of RU4REELZ LLC.</p>
          <p>b) Your subscription grants you a limited, non-exclusive, non-transferable license to use the platform for your authorized business purposes.</p>
          <p>c) You may not copy, modify, distribute, or create derivative works based on the platform.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>9. Limitation of Liability</p>
          <p>a) BuilderLeads is provided "as is" without warranties of any kind, express or implied.</p>
          <p>b) Provider's total liability shall not exceed the amount paid by you in the three (3) months preceding any claim.</p>
          <p>c) Provider is not liable for any indirect, incidental, consequential, special, or punitive damages, including lost profits, lost business, or lost data.</p>
          <p>d) Provider is not liable for any actions taken by homeowners, property owners, or other third parties in response to your outreach.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>10. Indemnification</p>
          <p>You agree to indemnify, defend, and hold harmless RU4REELZ LLC, its owners, officers, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses arising from: your use of the platform, your violation of these Terms, your outreach to homeowners, your violation of any applicable law, and any dispute between you and a homeowner or property owner.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>11. Termination</p>
          <p>a) Either party may terminate with 30 days written notice to freddy@ru4reelz.com.</p>
          <p>b) We may terminate or suspend your account immediately without notice if you violate these Terms, share credentials, resell data, or engage in prohibited uses.</p>
          <p>c) Upon termination, you must immediately stop using the platform and destroy any data, reports, or contact information obtained through BuilderLeads.</p>
          <p>d) Sections 4 (Prohibited Uses), 5 (Compliance), 9 (Limitation of Liability), and 10 (Indemnification) survive termination.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>12. Governing Law and Disputes</p>
          <p>These Terms are governed by the laws of the State of California. Any disputes shall be resolved in the courts of Los Angeles County, California. You waive any objection to jurisdiction or venue in these courts.</p>

          <p style={{ fontWeight: 600, color: '#fff', marginTop: 20 }}>13. Contact</p>
          <p>For questions about these Terms, contact:</p>
          <p>RU4REELZ LLC<br/>Email: freddy@ru4reelz.com<br/>Los Angeles, California</p>
        </div>
      </div>
    </div>
  )
}
