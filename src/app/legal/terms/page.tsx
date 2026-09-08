import type { Metadata } from 'next';
import React from 'react';
import { LegalDocument } from '../legal-document';
import { TERMS_DOC } from '../legal-content';

export const metadata: Metadata = {
  title: 'Terms of Service — Flowdek',
  description:
    'The Terms of Service that govern the use of Flowdek, the workflow and project management application.',
  robots: { index: true, follow: true },
};

/** Public, session-free Terms of Service page linked from the auth layouts. */
export default function TermsOfServicePage() {
  return <LegalDocument doc={TERMS_DOC} />;
}
