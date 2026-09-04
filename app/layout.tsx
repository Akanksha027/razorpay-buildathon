import { Analytics } from '@vercel/analytics/next'
import { Geist, Instrument_Serif } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  title: 'Profit Pilot — AI Sales Growth Agent',
  description:
    'AI upsells and win-back campaigns for merchants, bounded by non-AI policy checks, confidence escalation, and Razorpay payments. Log in to the dashboard.',
  keywords: ['AI sales', 'upsell engine', 'campaign automation', 'Razorpay', 'Profit Pilot'],
}

export const viewport: Viewport = {
  themeColor: '#F7F5F3',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${instrumentSerif.variable}`}>
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
