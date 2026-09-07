import Link from 'next/link';

/**
 * Privacy Policy.
 *
 * NOTE FOR THE PRODUCT OWNER: this is a plain-language starting template
 * describing how FlowDeck currently handles data (Neon PostgreSQL storage,
 * Gmail SMTP for transactional email, Google Drive only when the user
 * connects it, Paystack for payments). It is not legal advice — have it
 * reviewed before launch.
 */

const SECTION = { marginBottom: 20 } as const;

const H2 = { fontSize: 16, fontWeight: 700, color: '#1F2124', margin: '0 0 8px' } as const;

const P = { fontSize: 14, lineHeight: 1.7, color: '#4B5563', margin: 0 } as const;

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F2124', marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 32 }}>Last updated: September 2026</p>

      <section style={SECTION}>
        <h2 style={H2}>1. What we collect</h2>
        <p style={P}>
          Account data you give us (name, email, job title, avatar), the content you create in workspaces
          (projects, tasks, comments, files, budgets), and technical logs needed to run the Service
          (sign-in records, security audit events).
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>2. How we use it</h2>
        <p style={P}>
          To operate your workspace, collaborate with the teammates you invite, send transactional email
          (invitations, verification, password resets), process payments, and keep the Service secure. We do
          not sell your personal data and we do not use your workspace content for advertising.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>3. Storage and processors</h2>
        <p style={P}>
          Your data is stored in a managed cloud PostgreSQL database. We rely on a small number of processors:
          an email provider for transactional mail, a payment processor for subscriptions and marketplace
          payouts, and — only if you connect it — Google Drive, whose OAuth tokens we store encrypted and use
          solely for the files you choose to attach.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>4. Retention and deletion</h2>
        <p style={P}>
          We keep your data while your account is active. When you delete your account, we delete your
          personal data, except records we must retain for legal, billing or security reasons.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>5. Your rights</h2>
        <p style={P}>
          You can access and correct your profile from Settings, export your content from your workspaces, and
          request deletion of your account. If you are in a region with statutory data-protection rights (such
          as the EU/UK), you may also contact us to exercise those rights.
        </p>
      </section>

      <section style={SECTION}>
        <h2 style={H2}>6. Contact</h2>
        <p style={P}>
          Privacy questions or requests: <strong>kosokodaniel@gmail.com</strong>. See also our{' '}
          <Link href="/terms" style={{ color: '#C2410C' }}>Terms of Service</Link>.
        </p>
      </section>
    </main>
  );
}
