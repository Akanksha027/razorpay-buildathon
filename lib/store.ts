import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DecisionStatus = 'auto_approved' | 'escalated' | 'rejected' | 'approved' | 'caught_anomaly' | 'api_failure'
export type DecisionType = 'upsell' | 'campaign'

export interface AuditEntry {
  id: string
  type: DecisionType
  title: string
  customerId: string
  customerName: string
  proposedDiscount: number
  proposedDiscountPct: number
  cartValue: number
  margin: number
  aiReasoning: string
  cfoCast: string
  riskScore: number
  policyResult: string
  status: DecisionStatus
  razorpayId?: string
  budgetBefore: number
  budgetAfter: number
  timestamp: Date
  isAnomaly?: boolean
  anomalyReason?: string
  failureDetails?: string
}

export interface PendingApproval {
  entry: AuditEntry
}

export interface PolicyConfig {
  dailyTotalCap: number
  perCategoryCap: number
  perCustomerCap: number
  minMarginFloor: number
  maxDiscountPct: number
  aggressiveMode: boolean
}

export interface BudgetState {
  dailyUsed: number
  campaignUsed: number
  upsellUsed: number
}

export interface CustomerRecord {
  id: string
  name: string
  lastOrderValue: number
  lastOrderDate: Date
  totalLTV: number
  lastContactedAt?: Date
  segmentTag: 'high_value' | 'mid_value' | 'low_value'
  preferredCategories: string[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_CUSTOMERS: CustomerRecord[] = [
  { id: 'C482', name: 'A. Shah', lastOrderValue: 4200, lastOrderDate: new Date(Date.now() - 63 * 86400000), totalLTV: 22400, segmentTag: 'high_value', preferredCategories: ['accessories', 'apparel'] },
  { id: 'C731', name: 'R. Kumar', lastOrderValue: 2800, lastOrderDate: new Date(Date.now() - 45 * 86400000), totalLTV: 11200, segmentTag: 'mid_value', preferredCategories: ['footwear', 'accessories'] },
  { id: 'C119', name: 'M. Patel', lastOrderValue: 1100, lastOrderDate: new Date(Date.now() - 90 * 86400000), totalLTV: 4800, segmentTag: 'low_value', preferredCategories: ['apparel'] },
  { id: 'C205', name: 'S. Iyer', lastOrderValue: 3650, lastOrderDate: new Date(Date.now() - 55 * 86400000), totalLTV: 18900, segmentTag: 'high_value', preferredCategories: ['bags', 'accessories'] },
  { id: 'C390', name: 'P. Nair', lastOrderValue: 5200, lastOrderDate: new Date(Date.now() - 30 * 86400000), totalLTV: 31000, segmentTag: 'high_value', preferredCategories: ['footwear'] },
  { id: 'C094', name: 'N. Gupta', lastOrderValue: 870, lastOrderDate: new Date(Date.now() - 120 * 86400000), totalLTV: 2100, segmentTag: 'low_value', preferredCategories: ['apparel'] },
]

// ─── Initial data factory (runs on client only) ───────────────────────────────

function makeInitialAudit(): AuditEntry[] {
  return [
    {
      id: 'dec_8f42', type: 'upsell', title: 'Offered 8% off sock bundle to Customer #482',
      customerId: 'C482', customerName: 'A. Shah', proposedDiscount: 80, proposedDiscountPct: 8,
      cartValue: 1000, margin: 62,
      aiReasoning: "Customer has 3 prior purchases in apparel. Cart margin is 62%. Bundle upsell adds ₹80 discount on a ₹960 add-on. LTV risk is low at 0.36% of customer's total spend. Expected repeat-purchase probability: +22%.",
      cfoCast: 'Costs ₹80 (0.36% of C482 LTV ₹22,400). Historical bundle acceptance: 67%. Expected incremental revenue: ₹880.',
      riskScore: 18, policyResult: 'Within all policy bounds. Budget impact: ₹80 / ₹660 remaining.', status: 'auto_approved',
      razorpayId: 'pay_NK28X9', budgetBefore: 1760, budgetAfter: 1840, timestamp: new Date(Date.now() - 2 * 60000),
    },
    {
      id: 'dec_8f39', type: 'campaign', title: 'Escalated 15% win-back offer to Customer #731',
      customerId: 'C731', customerName: 'R. Kumar', proposedDiscount: 420, proposedDiscountPct: 15,
      cartValue: 2800, margin: 58,
      aiReasoning: 'Customer last ordered 45 days ago. Propensity to churn elevated. 15% discount estimated to deliver 78% win-back probability. Exceeds configured max discount policy of 10%.',
      cfoCast: 'Costs ₹420 (3.75% of LTV ₹11,200). Win-back probability at 15%: ~78%. Expected incremental revenue (90d): ₹2,200.',
      riskScore: 62, policyResult: 'Exceeded 10% max discount policy. Escalated for human review.', status: 'escalated',
      budgetBefore: 1700, budgetAfter: 1700, timestamp: new Date(Date.now() - 4 * 60000),
    },
    {
      id: 'dec_8f21', type: 'campaign', title: 'Blocked free shipping for Customer #119',
      customerId: 'C119', customerName: 'M. Patel', proposedDiscount: 150, proposedDiscountPct: 12,
      cartValue: 1100, margin: 48,
      aiReasoning: 'Customer is in low-value segment. Daily campaign budget has only ₹120 remaining — insufficient for ₹150 offer. Agent ranked this customer 14th by ROI and cut offer first.',
      cfoCast: 'Budget headroom: ₹120. Offer cost: ₹150. Delta: -₹30. Customer ranked lowest ROI in this campaign run.',
      riskScore: 45, policyResult: 'Daily campaign cap exhausted. Offer cut — insufficient budget.', status: 'rejected',
      budgetBefore: 1700, budgetAfter: 1700, timestamp: new Date(Date.now() - 10 * 60000),
    },
    {
      id: 'dec_8e98', type: 'upsell', title: 'Approved ₹120 bundle offer to Customer #205',
      customerId: 'C205', customerName: 'S. Iyer', proposedDiscount: 120, proposedDiscountPct: 3.3,
      cartValue: 3650, margin: 55,
      aiReasoning: 'Repeat buyer with strong bag + accessories affinity. Bundle offer is 3.3% of last order value. Margin post-discount remains at 52%, above the floor.',
      cfoCast: 'Costs ₹120 (0.63% of LTV ₹18,900). Cart affinity score: 0.82. Expected upsell conversion: 71%.',
      riskScore: 12, policyResult: 'Within all policy bounds. Margin check: 52% > 45% floor.', status: 'auto_approved',
      razorpayId: 'pay_NK24P8', budgetBefore: 1640, budgetAfter: 1760, timestamp: new Date(Date.now() - 16 * 60000),
    },
  ]
}

function makeInitialPending(audit: AuditEntry[]): PendingApproval[] {
  return [
    { entry: audit[1] },
    {
      entry: {
        id: 'dec_8f55', type: 'upsell', title: 'Proposed 12% discount to Customer #094',
        customerId: 'C094', customerName: 'N. Gupta', proposedDiscount: 104, proposedDiscountPct: 12,
        cartValue: 870, margin: 52,
        aiReasoning: 'Returning customer in apparel. 12% discount would bring margin to 40% — below the 45% floor. LTV suggests potential to convert to high-value tier. Agent escalates for merchant judgment.',
        cfoCast: 'Costs ₹104 (4.95% of LTV ₹2,100). Post-discount margin: 40%. Below floor by 5pp. Requires merchant override.',
        riskScore: 78, policyResult: 'Proposed margin (40%) below 45% minimum floor. Human approval required.', status: 'escalated',
        budgetBefore: 1840, budgetAfter: 1840, timestamp: new Date(Date.now() - 6 * 60000),
      }
    }
  ]
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ProfitPilotState {
  agentPaused: boolean
  agentMode: 'safe' | 'aggressive'
  policy: PolicyConfig
  budget: BudgetState
  auditLog: AuditEntry[]
  pendingApprovals: PendingApproval[]
  customers: CustomerRecord[]
  revenueRecovered: number
  totalDecisions: number
  totalAutoApproved: number
  totalEscalated: number

  toggleAgent: () => void
  setAgentMode: (mode: 'safe' | 'aggressive') => void
  updatePolicy: (patch: Partial<PolicyConfig>) => void
  addAuditEntry: (entry: AuditEntry) => void
  resolveApproval: (id: string, resolution: 'approved' | 'rejected') => void
  addPendingApproval: (entry: AuditEntry) => void
}

// Lazy-create the store once, on the client side only.
// This prevents Zustand's useContext from running during Next.js SSR.
let _store: ReturnType<typeof create<ProfitPilotState>> | null = null

function getStore() {
  if (_store) return _store

  const initialAudit = makeInitialAudit()
  const initialPending = makeInitialPending(initialAudit)

  _store = create<ProfitPilotState>((set) => ({
    agentPaused: false,
    agentMode: 'safe',

    policy: {
      dailyTotalCap: 2500,
      perCategoryCap: 800,
      perCustomerCap: 300,
      minMarginFloor: 45,
      maxDiscountPct: 10,
      aggressiveMode: false,
    },

    budget: { dailyUsed: 1840, campaignUsed: 1200, upsellUsed: 640 },

    auditLog: initialAudit,
    pendingApprovals: initialPending,
    customers: MOCK_CUSTOMERS,
    revenueRecovered: 42680,
    totalDecisions: 28,
    totalAutoApproved: 24,
    totalEscalated: 3,

    toggleAgent: () => set((s) => ({ agentPaused: !s.agentPaused })),
    setAgentMode: (mode) => set((s) => ({ agentMode: mode, policy: { ...s.policy, aggressiveMode: mode === 'aggressive' } })),
    updatePolicy: (patch) => set((s) => ({ policy: { ...s.policy, ...patch } })),

    addAuditEntry: (entry) => set((s) => ({
      auditLog: [entry, ...s.auditLog],
      totalDecisions: s.totalDecisions + 1,
      totalAutoApproved: entry.status === 'auto_approved' ? s.totalAutoApproved + 1 : s.totalAutoApproved,
      totalEscalated: entry.status === 'escalated' ? s.totalEscalated + 1 : s.totalEscalated,
      revenueRecovered: (entry.status === 'auto_approved' || entry.status === 'approved')
        ? s.revenueRecovered + Math.round(entry.cartValue * 0.12) : s.revenueRecovered,
      budget: {
        ...s.budget,
        dailyUsed: (entry.status === 'auto_approved' || entry.status === 'approved')
          ? Math.min(s.budget.dailyUsed + entry.proposedDiscount, s.policy.dailyTotalCap)
          : s.budget.dailyUsed,
      }
    })),

    addPendingApproval: (entry) => set((s) => ({
      pendingApprovals: [{ entry }, ...s.pendingApprovals],
      totalEscalated: s.totalEscalated + 1,
    })),

    resolveApproval: (id, resolution) => set((s) => {
      const approval = s.pendingApprovals.find(p => p.entry.id === id)
      if (!approval) return {}
      const resolved: AuditEntry = {
        ...approval.entry, status: resolution,
        razorpayId: resolution === 'approved'
          ? `pay_MAN${Array.from({ length: 5 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]).join('')}`
          : undefined,
      }
      return {
        pendingApprovals: s.pendingApprovals.filter(p => p.entry.id !== id),
        auditLog: s.auditLog.map(e => e.id === id ? resolved : e),
        revenueRecovered: resolution === 'approved'
          ? s.revenueRecovered + Math.round(approval.entry.cartValue * 0.08) : s.revenueRecovered,
        budget: {
          ...s.budget,
          dailyUsed: resolution === 'approved'
            ? Math.min(s.budget.dailyUsed + approval.entry.proposedDiscount, s.policy.dailyTotalCap)
            : s.budget.dailyUsed,
        }
      }
    }),
  }))

  return _store
}

// Public hook — safe to call only from 'use client' components
export function useStore(): ProfitPilotState {
  return getStore()()
}
