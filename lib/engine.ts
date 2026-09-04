import type { PolicyConfig, CustomerRecord } from './store'

// ─── Non-AI Sanity Layer (Section 5.6 — INTENTIONALLY not AI-driven) ────────
// This is the deterministic hard-stop that runs BEFORE any Razorpay call.
// It cannot be overridden by LLM output.

export interface SanityCheckResult {
  passed: boolean
  reason: string
  caughtAnomaly: boolean
}

export function runSanityCheck(
  proposedDiscountPct: number,
  proposedDiscount: number,
  margin: number,
  policy: PolicyConfig,
  budgetRemaining: number
): SanityCheckResult {
  // ① Absolute hard ceiling (non-negotiable, regardless of AI output)
  if (proposedDiscountPct > 50) {
    return {
      passed: false,
      caughtAnomaly: true,
      reason: `ANOMALY CAUGHT: Proposed ${proposedDiscountPct}% discount exceeds the absolute hard ceiling of 50%. This appears to be an AI hallucination or adversarial input. Action blocked before Razorpay API call.`,
    }
  }

  // ② Never sell below cost price
  const postDiscountMargin = margin - proposedDiscountPct
  if (postDiscountMargin < 0) {
    return {
      passed: false,
      caughtAnomaly: true,
      reason: `ANOMALY CAUGHT: Proposed discount results in negative margin (${postDiscountMargin.toFixed(1)}%). Selling below cost price is forbidden. Blocked at deterministic sanity layer.`,
    }
  }

  // ③ Absolute minimum margin (stricter than policy floor — catches edge cases)
  if (postDiscountMargin < 20) {
    return {
      passed: false,
      caughtAnomaly: true,
      reason: `ANOMALY CAUGHT: Post-discount margin of ${postDiscountMargin.toFixed(1)}% is dangerously low. Absolute hard floor: 20%. Blocked before reaching Razorpay.`,
    }
  }

  // ④ Budget overflow (prevents double-spend)
  if (proposedDiscount > budgetRemaining + 50) { // 50₹ tolerance
    return {
      passed: false,
      caughtAnomaly: false,
      reason: `Budget insufficient: ₹${proposedDiscount} requested, ₹${budgetRemaining} remaining.`,
    }
  }

  return { passed: true, caughtAnomaly: false, reason: 'All sanity checks passed.' }
}

// ─── Policy Engine (AI-adjacent rules, configurable by merchant) ─────────────

export interface PolicyCheckResult {
  autoApprove: boolean
  escalate: boolean
  reject: boolean
  reason: string
}

export function runPolicyCheck(
  proposedDiscountPct: number,
  proposedDiscount: number,
  margin: number,
  policy: PolicyConfig,
  budgetState: { dailyUsed: number },
  customerDailyDiscount: number,
  categoryDailyDiscount: number,
): PolicyCheckResult {
  const postDiscountMargin = margin - proposedDiscountPct
  const budgetRemaining = policy.dailyTotalCap - budgetState.dailyUsed

  if (budgetRemaining < proposedDiscount) {
    return { autoApprove: false, escalate: false, reject: true, reason: `Daily budget cap reached. ₹${proposedDiscount} needed, ₹${Math.max(0, budgetRemaining)} available.` }
  }

  if (categoryDailyDiscount + proposedDiscount > policy.perCategoryCap) {
    return { autoApprove: false, escalate: false, reject: true, reason: `Per-category cap of ₹${policy.perCategoryCap} would be exceeded (current: ₹${categoryDailyDiscount}).` }
  }

  if (customerDailyDiscount + proposedDiscount > policy.perCustomerCap) {
    return { autoApprove: false, escalate: true, reject: false, reason: `Per-customer daily cap of ₹${policy.perCustomerCap} would be exceeded. Escalated for merchant sign-off.` }
  }

  if (postDiscountMargin < policy.minMarginFloor) {
    if (policy.aggressiveMode && postDiscountMargin >= policy.minMarginFloor - 5) {
      return { autoApprove: true, escalate: false, reject: false, reason: `Aggressive mode: margin (${postDiscountMargin.toFixed(1)}%) is slightly below the ${policy.minMarginFloor}% floor. Approved given operating mode.` }
    }
    return { autoApprove: false, escalate: true, reject: false, reason: `Post-discount margin (${postDiscountMargin.toFixed(1)}%) is below the minimum floor of ${policy.minMarginFloor}%. Escalated for human judgment.` }
  }

  if (proposedDiscountPct > policy.maxDiscountPct) {
    return { autoApprove: false, escalate: true, reject: false, reason: `Proposed ${proposedDiscountPct}% exceeds max discount policy of ${policy.maxDiscountPct}%. Escalated for human approval before any Razorpay call.` }
  }

  return { autoApprove: true, escalate: false, reject: false, reason: `Within all policy bounds. Margin check: ${postDiscountMargin.toFixed(1)}% > ${policy.minMarginFloor}% floor. Budget impact: ₹${proposedDiscount} / ₹${Math.max(0, budgetRemaining)} remaining.` }
}

// ─── AI Reasoning Engine (Now calls real Gemini API via server routes) ────────

export interface AIDecision {
  proposedDiscountPct: number
  proposedDiscount: number
  title: string
  aiReasoning: string
  cfoCast: string
  riskScore: number
  bundleDescription: string
}

/**
 * Calls the real Gemini AI via /api/ai/upsell to generate an upsell decision.
 * Falls back to a conservative default if the API is unreachable.
 */
export async function generateUpsellDecision(
  customer: CustomerRecord,
  policy: PolicyConfig,
  cartValue: number = 3530,
  margin: number = 62
): Promise<AIDecision> {
  try {
    const res = await fetch('/api/ai/upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          id: customer.id,
          name: customer.name,
          segmentTag: customer.segmentTag,
          totalLTV: customer.totalLTV,
          lastOrderValue: customer.lastOrderValue,
          preferredCategories: customer.preferredCategories,
        },
        policy: {
          maxDiscountPct: policy.maxDiscountPct,
          minMarginFloor: policy.minMarginFloor,
          dailyTotalCap: policy.dailyTotalCap,
          perCustomerCap: policy.perCustomerCap,
        },
        cartValue,
        margin,
      }),
    })

    const data = await res.json()
    return data.decision as AIDecision
  } catch (err) {
    console.error('Failed to call upsell AI:', err)
    // Fallback to a conservative hardcoded decision
    const discount = Math.round(cartValue * 0.08)
    return {
      proposedDiscountPct: 8,
      proposedDiscount: discount,
      title: `Upsell bundle for Customer ${customer.id}`,
      aiReasoning: `AI service temporarily unavailable. Using conservative 8% bundle discount for ${customer.name} (${customer.segmentTag} segment, LTV ₹${customer.totalLTV}).`,
      cfoCast: `Fallback offer: ₹${discount} cost. Based on historical average for ${customer.segmentTag} customers.`,
      riskScore: 25,
      bundleDescription: 'Standard bundle (fallback)',
    }
  }
}

/**
 * Calls the real Gemini AI via /api/ai/campaign to generate a win-back decision.
 * Falls back to a conservative default if the API is unreachable.
 */
export async function generateCampaignDecision(
  customer: CustomerRecord,
  policy: PolicyConfig
): Promise<AIDecision> {
  try {
    const res = await fetch('/api/ai/campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          id: customer.id,
          name: customer.name,
          segmentTag: customer.segmentTag,
          totalLTV: customer.totalLTV,
          lastOrderValue: customer.lastOrderValue,
          lastOrderDate: customer.lastOrderDate,
          preferredCategories: customer.preferredCategories,
        },
        policy: {
          maxDiscountPct: policy.maxDiscountPct,
          minMarginFloor: policy.minMarginFloor,
          dailyTotalCap: policy.dailyTotalCap,
        },
      }),
    })

    const data = await res.json()
    return data.decision as AIDecision
  } catch (err) {
    console.error('Failed to call campaign AI:', err)
    const discount = Math.round(customer.lastOrderValue * 0.08)
    return {
      proposedDiscountPct: 8,
      proposedDiscount: discount,
      title: `Win-back: 8% offer for Customer ${customer.id}`,
      aiReasoning: `AI service temporarily unavailable. Using conservative 8% win-back for ${customer.name}.`,
      cfoCast: `Fallback: ₹${discount} cost against LTV of ₹${customer.totalLTV}.`,
      riskScore: 30,
      bundleDescription: '8% win-back via Razorpay Payment Link',
    }
  }
}

// ─── Real Razorpay Integration (via server-side API routes) ──────────────────

export interface RazorpayResult {
  success: boolean
  id?: string
  shortUrl?: string
  error?: string
  shouldRetry: boolean
}

let _simulateFailure = false
export function setSimulateFailure(v: boolean) { _simulateFailure = v }

/**
 * Creates a real Razorpay Order or Payment Link via our server API routes.
 * In "Simulate Outage" mode, the server route returns a fake failure.
 */
export async function createRazorpayOrder(
  amount: number,
  type: 'order' | 'payment_link',
  customerName?: string,
  customerId?: string,
  description?: string
): Promise<RazorpayResult> {
  try {
    const endpoint = type === 'order' ? '/api/razorpay/order' : '/api/razorpay/payment-link'

    const body: Record<string, any> = {
      amount,
      simulateFailure: _simulateFailure,
    }

    if (type === 'payment_link') {
      body.customerName = customerName || 'Customer'
      body.customerId = customerId || 'unknown'
      body.description = description || 'Win-back offer'
    }

    // Reset simulate flag after using it
    if (_simulateFailure) {
      _simulateFailure = false
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return {
      success: data.success,
      id: data.id,
      shortUrl: data.shortUrl,
      error: data.error,
      shouldRetry: data.shouldRetry ?? false,
    }
  } catch (err: any) {
    console.error('Razorpay API call failed:', err)
    return {
      success: false,
      error: err.message || 'Network error reaching Razorpay API route',
      shouldRetry: true,
    }
  }
}
