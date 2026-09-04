'use client'

import { useState } from 'react'
import { useStore } from '../lib/store'
import { broadcastPolicy } from '../lib/policySync'
import { MessageSquare, Send } from 'lucide-react'

type Msg = { role: 'user' | 'agent'; text: string }

/**
 * Text merchant copilot — maps natural language to policy / kill-switch actions.
 * Demo-friendly; no voice required.
 */
export default function MerchantCopilot() {
  const { policy, updatePolicy, agentPaused, toggleAgent } = useStore()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'agent',
      text: 'Ask me things like: "pause campaigns", "set max discount to 12%", "raise confidence threshold to 60".',
    },
  ])

  function reply(text: string) {
    setMsgs((m) => [...m, { role: 'agent', text }])
  }

  function handle(cmd: string) {
    const q = cmd.trim().toLowerCase()
    setMsgs((m) => [...m, { role: 'user', text: cmd }])
    setInput('')

    if (/pause|stop agent|kill/.test(q)) {
      if (!agentPaused) toggleAgent()
      reply('Kill switch ON — campaigns and autonomous sends are paused.')
      return
    }
    if (/resume|unpause|enable agent|start agent/.test(q)) {
      if (agentPaused) toggleAgent()
      reply('Agent resumed. Campaigns can run again.')
      return
    }
    const maxM = q.match(/max(?:imum)?\s*discount.*?(\d{1,2})/)
    if (maxM) {
      const v = Math.min(40, Math.max(5, Number(maxM[1])))
      const next = { ...policy, maxDiscountPct: v }
      updatePolicy({ maxDiscountPct: v })
      broadcastPolicy(next)
      reply(`Max discount set to ${v}% and broadcast to SweetDrip.`)
      return
    }
    const confM = q.match(/confidence.*?(\d{1,2})/)
    if (confM) {
      const v = Math.min(90, Math.max(20, Number(confM[1])))
      const next = { ...policy, confidenceThreshold: v }
      updatePolicy({ confidenceThreshold: v })
      broadcastPolicy(next)
      reply(`Confidence threshold set to ${v}% — low-confidence offers will escalate.`)
      return
    }
    const floorM = q.match(/margin.*?(\d{1,2})/)
    if (floorM) {
      const v = Math.min(50, Math.max(10, Number(floorM[1])))
      const next = { ...policy, minMarginFloor: v }
      updatePolicy({ minMarginFloor: v })
      broadcastPolicy(next)
      reply(`Margin floor set to ${v}%.`)
      return
    }
    if (/status|trust|budget/.test(q)) {
      reply(
        `Agent is ${agentPaused ? 'paused' : 'live'}. Max disc ${policy.maxDiscountPct}%, confidence ≥ ${policy.confidenceThreshold}%, margin floor ${policy.minMarginFloor}%, daily cap ₹${policy.dailyTotalCap}.`
      )
      return
    }
    reply('Try: pause campaigns · set max discount to 12 · confidence 60 · margin floor 40 · status')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-xs font-semibold text-background shadow-xl hover:opacity-90"
      >
        <MessageSquare className="size-4" />
        Merchant copilot
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[420px] w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Merchant copilot</p>
          <p className="text-[10px] text-muted-foreground">Policy + kill switch via chat</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-2 text-xs leading-5 ${
              m.role === 'user' ? 'ml-8 bg-accent/15 text-foreground' : 'mr-6 bg-muted text-muted-foreground'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) handle(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pause campaigns…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-accent"
        />
        <button type="submit" className="rounded-lg bg-accent px-3 text-background">
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  )
}
