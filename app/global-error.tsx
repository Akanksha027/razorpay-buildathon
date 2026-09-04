'use client'

// Provides a custom global error boundary so Next.js doesn't auto-generate
// one that pulls in our Zustand store during SSR prerendering.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ background: '#0e1117', color: '#f0f0f0', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Something went wrong</h2>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
            {error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{ background: 'oklch(0.72 0.18 142)', color: '#0e1117', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
