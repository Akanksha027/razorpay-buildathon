import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { supabase } from './supabase'

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
  confidence: number
  aiCostInr: number
  policyResult: string
  escalationReason?: string
  status: DecisionStatus
  razorpayId?: string
  budgetBefore: number
  budgetAfter: number
  timestamp: Date
  isAnomaly?: boolean
  anomalyReason?: string
  failureDetails?: string
  webhookFired?: boolean
  webhookPayload?: string
}

export interface PendingApproval {
  entry: AuditEntry
}

export interface WebhookEvent {
  id: string
  timestamp: Date
  decisionId: string
  channel: 'slack' | 'webhook'
  endpoint: string
  payload: string
  status: 'delivered' | 'stubbed'
}

export interface PolicyConfig {
  dailyTotalCap: number
  perCategoryCap: number
  perCustomerCap: number
  minMarginFloor: number
  maxDiscountPct: number
  aggressiveMode: boolean
  confidenceThreshold: number
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

// ─── Supabase → AuditEntry converter ─────────────────────────────────────────

function supabaseRowToAuditEntry(row: Record<string, unknown>): AuditEntry {
  const cartItems = (row.cart_items as string[]) || []
  const discountPct = Number(row.ai_proposed_discount_pct) || 0
  const status = mapStorefrontStatus(String(row.status || 'auto_approved'))
  const upsellItem = String(row.upsell_item || 'Unknown')

  return {
    id: String(row.id),
    type: 'upsell',
    title: `${statusVerb(status)} ${discountPct}% off ${upsellItem} — Storefront order`,
    customerId: 'STORE',
    customerName: 'Storefront Customer',
    proposedDiscount: Number(row.ai_proposed_discount) || 0,
    proposedDiscountPct: discountPct,
    cartValue: Math.round(Number(row.cart_total || 0) * 83), // USD → INR approx
    margin: 55,
    aiReasoning: String(row.ai_reasoning || ''),
    cfoCast: String(row.ai_cfo_cast || ''),
    riskScore: Number(row.ai_risk_score) || 0,
    confidence: Number(row.ai_confidence) || 70,
    aiCostInr: Number(row.ai_cost_inr) || 0.12,
    policyResult: String(row.policy_result || ''),
    escalationReason: row.rule_checker_verdict === 'escalated' ? String(row.which_rule_triggered || '') : undefined,
    status,
    razorpayId: row.razorpay_order_id ? String(row.razorpay_order_id) : undefined,
    budgetBefore: 0,
    budgetAfter: 0,
    timestamp: new Date(String(row.timestamp || Date.now())),
    isAnomaly: Boolean(row.is_anomaly),
    anomalyReason: row.is_anomaly ? String(row.failure_reason || 'Anomaly detected') : undefined,
    webhookFired: Boolean(row.webhook_fired),
  }
}

function mapStorefrontStatus(s: string): DecisionStatus {
  const map: Record<string, DecisionStatus> = {
    auto_approved: 'auto_approved',
    approved_by_human: 'approved',
    escalated: 'escalated',
    pending_approval: 'escalated',
    rejected: 'rejected',
    caught_anomaly: 'caught_anomaly',
    api_failure: 'api_failure',
    villain_blocked: 'rejected',
  }
  return map[s] || 'auto_approved'
}

function statusVerb(s: DecisionStatus): string {
  const map: Record<DecisionStatus, string> = {
    auto_approved: 'Approved',
    approved: 'Merchant-approved',
    escalated: 'Escalated',
    rejected: 'Blocked',
    caught_anomaly: 'Caught anomaly on',
    api_failure: 'API failure for',
  }
  return map[s] || 'Offered'
}

// ─── Initial data factory (seed entries that show the demo scenario) ──────────

function makeInitialAudit(): AuditEntry[] {
  return []
}

function makeInitialPending(audit: AuditEntry[]): PendingApproval[] {
  return []
}

function makeInitialWebhooks(): WebhookEvent[] {
  return []
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
  aiCostSpent: number
  webhookLog: WebhookEvent[]
  totalDecisions: number
  totalAutoApproved: number
  totalEscalated: number

  toggleAgent: () => void
  setAgentMode: (mode: 'safe' | 'aggressive') => void
  updatePolicy: (patch: Partial<PolicyConfig>) => void
  addAuditEntry: (entry: AuditEntry) => void
  resolveApproval: (id: string, resolution: 'approved' | 'rejected') => void
  addPendingApproval: (entry: AuditEntry) => void
  pushWebhookEvent: (event: Omit<WebhookEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }) => void
  initSupabaseSync: () => void
}

// Lazy-create the store once, on the client side only.
// This prevents Zustand's useContext from running during Next.js SSR.
let _store: UseBoundStore<StoreApi<ProfitPilotState>> | null = null
let _supabaseInitialized = false

function getStore(): UseBoundStore<StoreApi<ProfitPilotState>> {
  if (_store) return _store

  const initialAudit = makeInitialAudit()
  const initialPending = makeInitialPending(initialAudit)

  _store = create<ProfitPilotState>((set, get) => ({
    agentPaused: false,
    agentMode: 'safe',

    policy: {
      dailyTotalCap: 2500,
      perCategoryCap: 800,
      perCustomerCap: 300,
      minMarginFloor: 45,
      maxDiscountPct: 10,
      aggressiveMode: false,
      confidenceThreshold: 55,
    },

    budget: { dailyUsed: 0, campaignUsed: 0, upsellUsed: 0 },

    auditLog: initialAudit,
    pendingApprovals: initialPending,
    customers: MOCK_CUSTOMERS,
    revenueRecovered: 0,
    aiCostSpent: 0,
    webhookLog: makeInitialWebhooks(),
    totalDecisions: 0,
    totalAutoApproved: 0,
    totalEscalated: 0,

    toggleAgent: () => set((s) => ({ agentPaused: !s.agentPaused })),
    setAgentMode: (mode) => set((s) => ({ agentMode: mode, policy: { ...s.policy, aggressiveMode: mode === 'aggressive' } })),

    // ── Policy update: also sync to Supabase ──
    updatePolicy: (patch) => {
      set((s) => ({ policy: { ...s.policy, ...patch } }))
      // Sync to Supabase so the storefront can pick it up
      const updated = get().policy
      supabase.from('policies').upsert({
        id: 'default',
        margin_floor_pct: updated.minMarginFloor,
        daily_total_cap: updated.dailyTotalCap,
        max_discount_per_customer: updated.perCustomerCap,
        max_discount_pct: updated.maxDiscountPct,
        confidence_threshold: updated.confidenceThreshold,
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('[Supabase] Policy sync error:', error.message)
        else console.log('[Supabase] ✅ Policy synced to cloud')
      })
    },

    addAuditEntry: (entry) => set((s) => ({
      auditLog: [entry, ...s.auditLog],
      totalDecisions: s.totalDecisions + 1,
      totalAutoApproved: entry.status === 'auto_approved' ? s.totalAutoApproved + 1 : s.totalAutoApproved,
      totalEscalated: entry.status === 'escalated' ? s.totalEscalated + 1 : s.totalEscalated,
      revenueRecovered: (entry.status === 'auto_approved' || entry.status === 'approved')
        ? s.revenueRecovered + Math.round(entry.cartValue * 0.12) : s.revenueRecovered,
      aiCostSpent: s.aiCostSpent + (entry.aiCostInr || 0),
      budget: {
        ...s.budget,
        dailyUsed: (entry.status === 'auto_approved' || entry.status === 'approved')
          ? Math.min(s.budget.dailyUsed + entry.proposedDiscount, s.policy.dailyTotalCap)
          : s.budget.dailyUsed,
      }
    })),

    addPendingApproval: (entry) => set((s) => ({
      pendingApprovals: [{ entry }, ...s.pendingApprovals.filter(p => p.entry.id !== entry.id)],
      auditLog: s.auditLog.some(e => e.id === entry.id) ? s.auditLog : [entry, ...s.auditLog],
      totalDecisions: s.auditLog.some(e => e.id === entry.id) ? s.totalDecisions : s.totalDecisions + 1,
      totalEscalated: s.totalEscalated + 1,
      aiCostSpent: s.aiCostSpent + (entry.aiCostInr || 0),
    })),

    pushWebhookEvent: (event) => set((s) => ({
      webhookLog: [{
        id: event.id || `wh_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: event.timestamp || new Date(),
        decisionId: event.decisionId,
        channel: event.channel,
        endpoint: event.endpoint,
        payload: event.payload,
        status: event.status,
      }, ...s.webhookLog].slice(0, 40),
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
      // Also sync the resolution to Supabase
      supabase.from('audit_logs').update({ status: resolution === 'approved' ? 'approved_by_human' : 'rejected' })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('[Supabase] Resolution sync error:', error.message)
        })
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

    // ── Supabase real-time subscription ──
    initSupabaseSync: () => {
      if (_supabaseInitialized) return
      _supabaseInitialized = true

      console.log('[Supabase] 🔌 Initializing real-time sync...')

      // 1. Fetch existing storefront entries from Supabase
      supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (error) {
            console.error('[Supabase] Fetch error:', error.message)
            return
          }
          if (data && data.length > 0) {
            const existingIds = new Set(get().auditLog.map(e => e.id))
            const newEntries = data
              .filter((row) => !existingIds.has(String(row.id)))
              .map(supabaseRowToAuditEntry)

            if (newEntries.length > 0) {
              set((s) => ({
                auditLog: [...newEntries, ...s.auditLog],
                totalDecisions: s.totalDecisions + newEntries.length,
                totalAutoApproved: s.totalAutoApproved + newEntries.filter(e => e.status === 'auto_approved').length,
                totalEscalated: s.totalEscalated + newEntries.filter(e => e.status === 'escalated').length,
                revenueRecovered: s.revenueRecovered + newEntries
                  .filter(e => e.status === 'auto_approved' || e.status === 'approved')
                  .reduce((sum, e) => sum + Math.round(e.cartValue * 0.12), 0),
                aiCostSpent: s.aiCostSpent + newEntries.reduce((sum, e) => sum + e.aiCostInr, 0),
              }))
              console.log(`[Supabase] ✅ Loaded ${newEntries.length} storefront entries`)
            }
          }
        })

      // 2. Subscribe to real-time INSERTs on audit_logs
      supabase
        .channel('dashboard-audit-sync')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'audit_logs' },
          (payload) => {
            const entry = supabaseRowToAuditEntry(payload.new)
            const existingIds = new Set(get().auditLog.map(e => e.id))
            if (existingIds.has(entry.id)) return // skip duplicates

            console.log('[Supabase] 🆕 Live storefront decision received:', entry.id)

            set((s) => ({
              auditLog: [entry, ...s.auditLog],
              totalDecisions: s.totalDecisions + 1,
              totalAutoApproved: entry.status === 'auto_approved' ? s.totalAutoApproved + 1 : s.totalAutoApproved,
              totalEscalated: entry.status === 'escalated' ? s.totalEscalated + 1 : s.totalEscalated,
              revenueRecovered: (entry.status === 'auto_approved' || entry.status === 'approved')
                ? s.revenueRecovered + Math.round(entry.cartValue * 0.12) : s.revenueRecovered,
              aiCostSpent: s.aiCostSpent + (entry.aiCostInr || 0),
              budget: {
                ...s.budget,
                dailyUsed: (entry.status === 'auto_approved' || entry.status === 'approved')
                  ? Math.min(s.budget.dailyUsed + entry.proposedDiscount, s.policy.dailyTotalCap)
                  : s.budget.dailyUsed,
              },
              // If it's escalated, also add to pending approvals
              pendingApprovals: entry.status === 'escalated'
                ? [{ entry }, ...s.pendingApprovals]
                : s.pendingApprovals,
            }))
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'audit_logs' },
          (payload) => {
            const updated = supabaseRowToAuditEntry(payload.new)
            console.log('[Supabase] 🔄 Storefront decision updated:', updated.id, '→', updated.status)
            set((s) => ({
              auditLog: s.auditLog.map(e => e.id === updated.id ? updated : e),
            }))
          }
        )
        .subscribe()

      // 3. Fetch the current policy from Supabase
      supabase
        .from('policies')
        .select('*')
        .eq('id', 'default')
        .single()
        .then(({ data, error }) => {
          if (error || !data) return
          set((s) => ({
            policy: {
              ...s.policy,
              minMarginFloor: data.margin_floor_pct,
              dailyTotalCap: data.daily_total_cap,
              perCustomerCap: data.max_discount_per_customer,
              maxDiscountPct: data.max_discount_pct,
              confidenceThreshold: data.confidence_threshold,
            }
          }))
          console.log('[Supabase] ✅ Policy loaded from cloud')
        })
    },
  }))

  return _store
}

// Public hook — safe to call only from 'use client' components
export function useStore(): ProfitPilotState {
  return getStore()()
}
