'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', margin: 0, fontFamily: 'sans-serif', background: '#F7F7F7', color: '#111827' }}>
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 500 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
            {error?.message || 'A critical error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#FE8029', color: '#FFFFFF', border: 'none', borderRadius: 10,
              padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
