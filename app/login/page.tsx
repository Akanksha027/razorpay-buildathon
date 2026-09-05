'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { loginSession } from '../../lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Enter your name to continue.')
      return
    }
    setLoading(true)
    // Demo login — pass a dummy email and the entered name
    loginSession('demo@merchant.com', name.trim())
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F7F5F3] text-[#37322F] flex flex-col">
      <header className="w-full border-b border-[rgba(55,50,47,0.12)] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-medium text-lg">Profit Pilot</Link>
        <Link href="/" className="text-sm text-[rgba(49,45,43,0.80)] hover:text-[#37322F]">← Back to site</Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white border border-[rgba(55,50,47,0.12)] rounded-2xl shadow-[0_8px_30px_rgba(55,50,47,0.06)] p-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#605A57] mb-2">Merchant access</p>
          <h1 className="font-serif text-3xl text-[#37322F] mb-2">Log in to Profit Pilot</h1>
          <p className="text-sm text-[#605A57] mb-8 leading-6">
            Open the AI sales agent dashboard — approvals, live policy, campaigns, and Razorpay-backed decisions.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#605A57] mb-1.5">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[rgba(55,50,47,0.15)] bg-[#FBFAf9] px-3.5 py-2.5 text-sm outline-none focus:border-[#37322F] focus:ring-2 focus:ring-[rgba(55,50,47,0.08)]"
                placeholder="e.g. Akanksha"
                autoComplete="name"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-[#37322F] text-white text-sm font-medium hover:bg-[#2A2520] transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Enter dashboard'}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-[#605A57] text-center leading-5">
            Demo mode: any name works. Built for the Razorpay AI Buildathon.
          </p>
        </div>
      </main>
    </div>
  )
}
