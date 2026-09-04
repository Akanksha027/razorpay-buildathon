import { NextRequest, NextResponse } from 'next/server'

/** Demo stub — logs a win-back "email/SMS" with Payment Link. No real ESP required. */
const recent: Array<{ id: string; at: string; to: string; channel: string; body: string }> = []

export async function POST(req: NextRequest) {
  try {
    const { to, customerName, shortUrl, offerPct, channel } = await req.json()
    const id = 'msg_' + Math.random().toString(36).slice(2, 9)
    const body = `Hi ${customerName || 'there'} — we miss you at the shop. Here's ${offerPct || 10}% off: ${shortUrl || '(link pending)'}`
    const entry = {
      id,
      at: new Date().toISOString(),
      to: to || `${(customerName || 'customer').toLowerCase().replace(/\s+/g, '.')}@profitpilot.test`,
      channel: channel === 'sms' ? 'sms' : 'email',
      body,
    }
    recent.unshift(entry)
    if (recent.length > 40) recent.pop()
    console.log('[notify-stub]', entry)
    return NextResponse.json({ success: true, stubbed: true, ...entry })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, count: recent.length, recent })
}
