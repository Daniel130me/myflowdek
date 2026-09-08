import React from 'react';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model/constants';
import { routes } from '@/shared/navigation/routes';
import { LEGAL_LAST_UPDATED, type LegalDocumentData } from './legal-content';

/**
 * Shared presentation for the public legal documents (/legal/terms,
 * /legal/privacy).
 *
 * Intentionally a Server Component: the documents are static content, so
 * nothing here ships JavaScript to the browser. The visual language mirrors
 * the auth pages (dark navy branding + white document) so the pages feel
 * part of the product when opened from the login/signup footer.
 */

function formatDate(iso: string): string {
  // `en-GB` renders the unambiguous day-month-year form used elsewhere in
  // the legal copy ("9 September 2026").
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function LegalDocument({ doc }: { doc: LegalDocumentData }) {
  return (
    <div style={{ minHeight: '100vh', fontFamily: FF, color: COLORS.ink, background: COLORS.card }}>
      {/* Branding header — same dark chrome as the auth layouts */}
      <header
        style={{
          background: 'linear-gradient(135deg, #1F2124 0%, #2D2F33 100%)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: COLORS.accentBright,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={16} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF' }}>Flowdek</span>
        </div>
        <Link
          href={routes.login()}
          style={{
            fontSize: 13,
            color: '#FFFFFF',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '6px 14px',
            textDecoration: 'none',
          }}
        >
          Back to sign in
        </Link>
      </header>

      {/* Document body */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 56px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 8px', color: COLORS.ink }}>{doc.title}</h1>
        <p style={{ fontSize: 13, color: COLORS.gray, margin: '0 0 28px' }}>
          Last updated: {formatDate(LEGAL_LAST_UPDATED)}
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: COLORS.navySoft, marginTop: 0 }}>{doc.intro}</p>

        {doc.sections.map((section) => (
          <section key={section.heading} style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: COLORS.ink }}>{section.heading}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} style={{ fontSize: 15, lineHeight: 1.7, color: COLORS.gray, margin: '0 0 12px' }}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        {/* Cross-links so readers can move between the two documents */}
        <footer
          style={{
            marginTop: 48,
            paddingTop: 20,
            borderTop: `1px solid ${COLORS.line}`,
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 13,
          }}
        >
          <Link href={routes.terms()} style={{ color: COLORS.accent, fontWeight: 600, textDecoration: 'none' }}>
            Terms of Service
          </Link>
          <Link href={routes.privacy()} style={{ color: COLORS.accent, fontWeight: 600, textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          <Link href={routes.login()} style={{ color: COLORS.gray, textDecoration: 'none' }}>
            Back to Flowdek
          </Link>
        </footer>
      </main>
    </div>
  );
}
