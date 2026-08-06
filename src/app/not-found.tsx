'use client';

import React from 'react';
import Link from 'next/link';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', margin: 0, fontFamily: FF, background: '#F7F7F7', color: '#111827' }}>
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 500 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Page Not Found</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            href="/projects"
            style={{
              background: '#FE8029', color: '#FFFFFF', borderRadius: 10,
              padding: '10px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Return to Dashboard
          </Link>
        </div>
      </body>
    </html>
  );
}
