'use client';

export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-sans">
        <div className="p-8 max-w-md text-center bg-slate-900 rounded-xl shadow-xl border border-slate-800">
          <h2 className="text-2xl font-bold mb-4 text-orange-500">Application Error</h2>
          <p className="text-slate-300 mb-6 text-sm">
            {error.message || 'An unexpected error occurred in Flowdek.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

