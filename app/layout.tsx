import { Analytics } from '@vercel/analytics/next'
import { Geist } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Profit Pilot — AI Sales Growth Agent',
  description: 'Real-time AI upsell engine + autonomous campaign agent for merchants. Every financial decision is bounded, explainable, and auditable.',
  keywords: ['AI sales', 'upsell engine', 'campaign automation', 'Razorpay', 'merchant tools'],
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0e1117',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`bg-background ${geist.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
