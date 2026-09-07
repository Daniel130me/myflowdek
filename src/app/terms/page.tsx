import Link from 'next/link';

/**
 * Terms of Service.
 *
 * NOTE FOR THE PRODUCT OWNER: this is a plain-language starting template, not
 * legal advice. Have a lawyer review/replace the content before launch — the
 * audit (Section 4) flagged that shipping no terms page at all is worse for
 * launch than shipping a reviewable draft.
 */

const SECTION = { marginBottom: 20 } as const;

const H2 = { fontSize: 16, fontWeight: 700, color: '#1F2124', margin: '0 0 8px' } as const;

const P = { fontSize: 14, lineHeight: 1.7, color: '#4B5563', margin: 0 } as const;

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F2124', marginBottom: 4 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 32 }}>Last updated: September 2026</p>

      <section style={SECTION}>
        <h2 style={H2}>1. Acceptance of terms</h2>
        <p style={P}>
          By creating a FlowDeck account or using the FlowDeck application (the &ldquo;Service&rdquo;), you agree to
          these Terms of Service. If you use the Service on behalf of an organization, you confirm you have
          authority to bind that organization to these terms.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>2. Your account</h2>
        <p style={P}>
          You are responsible for keeping your sign-in credentials secure and for all activity that happens
          under your account. You must provide accurate registration information and use a workspace email you
          are authorised to use.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>3. Acceptable use</h2>
        <p style={P}>
          You may not use the Service to store or distribute unlawful content, to attack or disrupt the
          Service or other users, to reverse-engineer it beyond what the law allows, or to resell access
          without a written agreement.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>4. Your content</h2>
        <p style={P}>
          You keep ownership of the projects, tasks, files and other content you create in FlowDeck
          (&ldquo;Your Content&rdquo;). You grant us the limited right to store, back up and process Your Content
          strictly to operate and improve the Service. You are responsible for having the rights needed to
          upload Your Content.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>5. Subscriptions and payments</h2>
        <p style={P}>
          Paid plans renew automatically until cancelled unless stated otherwise. Fees are charged through our
          payment processor, and prices may change with reasonable notice. Marketplace engagements between
          clients and professionals are agreements between those parties; FlowDeck provides the platform and
          escrow-style payment handling but is not a party to the underlying work agreement.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>6. Availability and changes</h2>
        <p style={P}>
          We work to keep the Service available and correct, but we provide it &ldquo;as is&rdquo; without
          warranties of any kind to the extent permitted by law. We may add, change or remove features; if we
          make a material change that affects your rights, we will notify you in advance where practical.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>7. Limitation of liability</h2>
        <p style={P}>
          To the maximum extent permitted by law, FlowDeck is not liable for indirect or consequential damages,
          and our total liability relating to the Service is limited to the amount you paid us in the twelve
          months before the claim.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>8. Termination</h2>
        <p style={P}>
          You can stop using the Service and delete your account at any time. We may suspend or terminate
          accounts that violate these terms or that create legal or security risk for the Service or other
          users.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>9. Contact</h2>
        <p style={P}>
          Questions about these terms? Reach us at <strong>kosokodaniel@gmail.com</strong>. See also our{' '}
          <Link href="/privacy" style={{ color: '#C2410C' }}>Privacy Policy</Link>.
        </p>
      </section>
    </main>
  );
}
