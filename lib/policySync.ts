import type { PolicyConfig } from './store'

export const POLICY_MSG = 'PROFIT_PILOT_POLICY'

/** Broadcast live policy to iframe + BroadcastChannel + local API mirror. */
export function broadcastPolicy(policy: PolicyConfig, iframe?: HTMLIFrameElement | null) {
  try {
    iframe?.contentWindow?.postMessage({ type: POLICY_MSG, policy }, '*')
  } catch { /* cross-origin ok — postMessage still works */ }

  try {
    const bc = new BroadcastChannel('profit-pilot-policy')
    bc.postMessage({ type: POLICY_MSG, policy })
    bc.close()
  } catch { /* ignore */ }

  // Mirror to our own API
  void fetch('/api/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy }),
  }).catch(() => {})

  // Also push to sweetdrip if a sync URL is configured (local or prod)
  const sweetdrip =
    (typeof window !== 'undefined' && (window as any).__SWEETDRIP_ORIGIN__) ||
    process.env.NEXT_PUBLIC_SWEETDRIP_URL ||
    'https://icecreamcookie.vercel.app'

  void fetch(`${sweetdrip.replace(/\/$/, '')}/api/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy }),
    mode: 'cors',
  }).catch(() => {
    /* CORS may block cross-origin POST — postMessage still covers iframe demos */
  })
}

export async function fireEscalationWebhook(opts: {
  decisionId: string
  title: string
  reason: string
  confidence: number
  discountPct: number
  customerName?: string
}) {
  const payload = {
    channel: '#merchant-approvals',
    username: 'Profit Pilot',
    text: `⚠️ Escalation needs your approval\n• ${opts.title}\n• Customer: ${opts.customerName || '—'}\n• ${opts.discountPct}% off\n• Confidence: ${opts.confidence}%\n• Why: ${opts.reason}`,
    decisionId: opts.decisionId,
    ts: new Date().toISOString(),
  }

  try {
    const res = await fetch('/api/webhook/escalation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return {
      success: true as const,
      endpoint: data.endpoint as string,
      payload: JSON.stringify(payload, null, 2),
    }
  } catch {
    return {
      success: false as const,
      endpoint: '/api/webhook/escalation',
      payload: JSON.stringify(payload, null, 2),
    }
  }
}
