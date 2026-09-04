'use client'

import dynamic from 'next/dynamic'

// Wrap the entire dashboard in a dynamic import with SSR disabled.
// This is necessary because the Zustand store uses React context (useContext)
// which cannot be executed during Next.js SSR prerendering.
const Dashboard = dynamic(() => import('./dashboard'), { ssr: false, loading: () => <AppSkeleton /> })

function AppSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/20 ring-1 ring-accent/30 animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(0.72 0.18 142)" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Loading Profit Pilot…</p>
      </div>
    </div>
  )
}

export default function Page() {
  return <Dashboard />
}
