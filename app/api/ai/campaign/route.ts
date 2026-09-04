import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const { customer, policy } = await req.json()

    const daysSinceLastOrder = Math.round(
      (Date.now() - new Date(customer.lastOrderDate).getTime()) / 86400000
    )

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are Profit Pilot, an AI win-back campaign agent for an e-commerce merchant.

You are evaluating whether to send a win-back discount offer to a lapsed customer.

CUSTOMER DATA:
- Customer ID: ${customer.id}
- Name: ${customer.name}
- Segment: ${customer.segmentTag}
- Lifetime Value (LTV): ₹${customer.totalLTV}
- Last Order Value: ₹${customer.lastOrderValue}
- Days Since Last Order: ${daysSinceLastOrder}
- Preferred Categories: ${customer.preferredCategories?.join(', ') || 'general'}

MERCHANT POLICIES:
- Max discount allowed: ${policy.maxDiscountPct}%
- Minimum margin floor: ${policy.minMarginFloor}%
- Daily budget cap: ₹${policy.dailyTotalCap}

You MUST respond with ONLY a valid JSON object (no markdown fencing, no extra text) with these fields:
{
  "proposedDiscountPct": <number between 5 and 15>,
  "aiReasoning": "<2-3 sentence reasoning about whether this customer is worth a win-back offer, referencing their LTV, days since order, and segment>",
  "cfoCast": "<1-2 sentence CFO-style cost-benefit analysis with actual numbers>",
  "riskScore": <number between 10 and 90>
}

Consider: high-LTV customers who haven't ordered in 30-90 days are prime targets. Low-LTV customers with very old orders are probably not worth it. Be specific with numbers.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const proposedDiscount = Math.round(customer.lastOrderValue * parsed.proposedDiscountPct / 100)

    return NextResponse.json({
      success: true,
      decision: {
        proposedDiscountPct: parsed.proposedDiscountPct,
        proposedDiscount,
        title: `Win-back: ${parsed.proposedDiscountPct}% offer for Customer ${customer.id}`,
        aiReasoning: parsed.aiReasoning,
        cfoCast: parsed.cfoCast,
        riskScore: parsed.riskScore,
        bundleDescription: `${parsed.proposedDiscountPct}% win-back via Razorpay Payment Link`,
      }
    })
  } catch (error: any) {
    console.error('Gemini campaign error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'AI reasoning failed',
      decision: {
        proposedDiscountPct: 8,
        proposedDiscount: Math.round(3000 * 0.08),
        title: 'Win-back offer (AI fallback)',
        aiReasoning: 'AI service unavailable. Falling back to conservative 8% win-back discount.',
        cfoCast: 'Fallback: ₹240 cost. Based on segment average response rate of 42%.',
        riskScore: 30,
        bundleDescription: '8% win-back via Razorpay Payment Link',
      }
    })
  }
}
