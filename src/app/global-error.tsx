'use client';
import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#F7F7F7', color: '#1F2124' }}>
          <h1 style={{ fontSize: '48px', margin: '0 0 16px 0' }}>Error</h1>
          <h2 style={{ fontSize: '24px', margin: '0 0 24px 0', fontWeight: 500 }}>Something went wrong!</h2>
          <p style={{ fontSize: '16px', margin: '0 0 32px 0', color: '#6B7280' }}>{error?.message || 'An unexpected error occurred.'}</p>
          <button 
            onClick={() => reset()}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#FE8029', 
              color: 'white', 
              border: 'none',
              borderRadius: '8px', 
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
