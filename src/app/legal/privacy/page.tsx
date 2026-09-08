import type { Metadata } from 'next';
import React from 'react';
import { LegalDocument } from '../legal-document';
import { PRIVACY_DOC } from '../legal-content';

export const metadata: Metadata = {
  title: 'Privacy Policy — Flowdek',
  description:
    'How Flowdek collects, uses, shares, and protects personal data, and the choices available to our users.',
  robots: { index: true, follow: true },
};

/** Public, session-free Privacy Policy page linked from the auth layouts. */
export default function PrivacyPolicyPage() {
  return <LegalDocument doc={PRIVACY_DOC} />;
}
