import { NextRequest, NextResponse } from 'next/server'

// Dashboard-local policy mirror (used when syncing to iframe / local sweetdrip)

let livePolicy = {
  dailyTotalCap: 2500,
  perCategoryCap: 800,
  perCustomerCap: 300,
  minMarginFloor: 45,
  maxDiscountPct: 10,
  aggressiveMode: false,
  confidenceThreshold: 55,
}
let updatedAt = new Date().toISOString()

export async function GET() {
  return NextResponse.json({ success: true, policy: livePolicy, updatedAt })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const patch = body.policy || body
    livePolicy = { ...livePolicy, ...patch }
    updatedAt = new Date().toISOString()
    return NextResponse.json({ success: true, policy: livePolicy, updatedAt })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
