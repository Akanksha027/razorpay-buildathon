import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
})

export async function POST(req: NextRequest) {
  try {
    const { amount, customerName, customerId, description } = await req.json()

    // Create a real Razorpay Payment Link in TEST mode
    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      description: description || `Win-back offer for ${customerName}`,
      customer: {
        name: customerName || 'Customer',
        // In test mode, we don't need real contact info
        // but Razorpay requires at least an email or contact
        email: `${(customerId || 'customer').toLowerCase()}@profitpilot.test`,
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      notes: {
        source: 'profit_pilot',
        type: 'campaign_winback',
        customer_id: customerId || '',
      },
      callback_url: '',
      callback_method: '',
    })

    return NextResponse.json({
      success: true,
      id: paymentLink.id,
      shortUrl: paymentLink.short_url,
      shouldRetry: false,
    })
  } catch (error: any) {
    console.error('Razorpay payment link error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Razorpay payment link creation failed',
      shouldRetry: true,
    })
  }
}
