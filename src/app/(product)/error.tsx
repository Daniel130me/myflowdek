'use client';

import React, { useEffect } from 'react';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Flowdek error boundary caught error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 400, padding: 32, textAlign: 'center', fontFamily: FF,
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
        Something went wrong
      </h2>
      <p style={{ fontSize: 14, color: '#6B7280', maxWidth: 440, marginBottom: 20 }}>
        {error?.message || 'An unexpected error occurred while rendering this page.'}
      </p>
      <button
        onClick={() => reset()}
        style={{
          background: '#FE8029', color: '#FFFFFF', border: 'none', borderRadius: 10,
          padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
