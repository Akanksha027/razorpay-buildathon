import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
})

export async function POST(req: NextRequest) {
  try {
    const { amount, simulateFailure } = await req.json()

    // Simulate outage if the dashboard triggers it
    if (simulateFailure) {
      return NextResponse.json({
        success: false,
        error: 'Gateway timeout after 4,000ms. No charge created. Safe to retry.',
        shouldRetry: true,
      })
    }

    // Create a real Razorpay Order in TEST mode
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `receipt_pp_${Date.now()}`,
      notes: {
        source: 'profit_pilot',
        type: 'upsell_order',
      },
    })

    return NextResponse.json({
      success: true,
      id: order.id,
      shouldRetry: false,
    })
  } catch (error: any) {
    console.error('Razorpay order error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Razorpay order creation failed',
      shouldRetry: true,
    })
  }
}
