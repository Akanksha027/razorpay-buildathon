import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const { customer, policy, cartValue, margin } = await req.json()

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are Profit Pilot, an AI sales agent for an e-commerce merchant.

A customer is checking out. Your job is to decide whether to offer an upsell/bundle discount, and if so, how much.

CUSTOMER CONTEXT:
- Customer ID: ${customer.id}
- Name: ${customer.name}
- Segment: ${customer.segmentTag}
- Lifetime Value (LTV): ₹${customer.totalLTV}
- Last Order Value: ₹${customer.lastOrderValue}
- Preferred Categories: ${customer.preferredCategories?.join(', ') || 'general'}

CART CONTEXT:
- Cart Value: ₹${cartValue}
- Blended Margin: ${margin}%

MERCHANT POLICIES:
- Max discount allowed: ${policy.maxDiscountPct}%
- Minimum margin floor: ${policy.minMarginFloor}%
- Daily budget cap: ₹${policy.dailyTotalCap}
- Per-customer cap: ₹${policy.perCustomerCap}

You MUST respond with ONLY a valid JSON object (no markdown fencing, no extra text) with these fields:
{
  "proposedDiscountPct": <number between 3 and 15>,
  "bundleDescription": "<short name for the bundle, e.g. 'Sock bundle add-on'>",
  "aiReasoning": "<2-3 sentence reasoning for the discount, referencing customer data and margin>",
  "cfoCast": "<1-2 sentence CFO-style cost-benefit analysis with numbers>",
  "riskScore": <number between 5 and 95>
}

Think like a smart, cautious sales agent. Keep discounts reasonable. Reference actual numbers from the context.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Parse the JSON from the response, stripping any markdown fencing
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    // Compute the actual discount amount
    const proposedDiscount = Math.round(cartValue * parsed.proposedDiscountPct / 100)

    return NextResponse.json({
      success: true,
      decision: {
        proposedDiscountPct: parsed.proposedDiscountPct,
        proposedDiscount,
        title: `Upsell "${parsed.bundleDescription}" for Customer ${customer.id}`,
        aiReasoning: parsed.aiReasoning,
        cfoCast: parsed.cfoCast,
        riskScore: parsed.riskScore,
        bundleDescription: parsed.bundleDescription,
      }
    })
  } catch (error: any) {
    console.error('Gemini upsell error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'AI reasoning failed',
      // Return a sensible fallback so the UI doesn't break
      decision: {
        proposedDiscountPct: 8,
        proposedDiscount: Math.round(3530 * 0.08),
        title: 'Upsell bundle (AI fallback)',
        aiReasoning: 'AI service unavailable. Falling back to conservative 8% bundle discount based on historical average.',
        cfoCast: 'Fallback offer: ₹282 discount. Conservative estimate based on segment averages.',
        riskScore: 25,
        bundleDescription: 'Standard bundle offer',
      }
    })
  }
}
