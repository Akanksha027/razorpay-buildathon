# Profit Pilot — Product Requirements Document

**Razorpay AI Buildathon Submission**
**Track:** Grows a Merchant's Sales (Smart Upsells + Automated Campaigns)
**Version:** 1.0

---

## 1. Overview

Profit Pilot is an AI sales-growth agent for merchants that operates in two connected modes — a **real-time upsell engine** during checkout, and an **autonomous outbound campaign agent** for lapsed customers — both governed by a single shared budget and policy brain, with every financial decision bounded, explained, logged, and human-gated where required.

Unlike a simple recommendation bot, Profit Pilot is built to demonstrate the three things Razorpay explicitly asks for: **Safety & Control, Audit Trail, and Failure Handling** — not as afterthoughts, but as the core architecture.

---

## 2. Problem Statement

Merchants lose revenue in two silent ways:
1. **At checkout** — they don't upsell/cross-sell consistently because it requires manual effort or rigid, non-adaptive rules.
2. **After checkout** — lapsed customers are rarely re-engaged with the right offer at the right time, because manual analysis doesn't scale.

At the same time, merchants are cautious about letting AI make pricing/discount decisions autonomously — there's no trusted "seatbelt" that lets AI act on revenue without risking margin, brand trust, or runaway spend.

**Profit Pilot solves both**: it grows sales through AI-driven upsells and campaigns, while proving — visibly, in real time — that the AI cannot act outside pre-set financial and business guardrails.

---

## 3. Goals

- Increase average order value via real-time, margin-aware upsell offers.
- Recover revenue from lapsed customers via autonomous, budget-capped win-back campaigns.
- Prove every financial action is bounded, explainable, and auditable.
- Demonstrate graceful failure handling under at least two distinct failure modes.
- Show clear, live evidence of "AI judgment" — including moments where the AI correctly chooses **not** to act.

### Non-goals (out of scope for this build)
- Real payment processing (test mode only, via Razorpay test APIs).
- Multi-merchant, multi-tenant production infrastructure.
- Full-scale ML/personalization models — reasoning can be LLM-driven with rule-based guardrails, not a trained recommender system.

---

## 4. Users

| User | Need |
|---|---|
| Merchant (store owner) | Wants more revenue without manually managing discounts or campaigns; wants visibility and control, not a black box. |
| Customer (shopper) | Receives relevant, non-intrusive offers during checkout. |
| Judge / Evaluator | Needs to clearly see AI reasoning, guardrails in action, and failure recovery within a short demo window. |

---

## 5. Core Features

### 5.1 Real-Time Upsell Engine (Hand 1)
- Triggered when a customer adds an item to cart.
- Agent evaluates: cart contents, item margin, customer history (if available), and remaining daily/category/customer discount budget.
- Agent proposes a bundle/add-on with a computed discount.
- **Decision path:**
  - Within policy limits → auto-approved → Razorpay order created for the add-on.
  - Outside policy limits → held in an approval queue for merchant sign-off before any Razorpay call is made.
- Live reasoning trace shown on the dashboard as the decision happens (not just the final result).

### 5.2 Autonomous Campaign Agent (Hand 2)
- Periodically (or on-demand for demo) scans recent order history.
- Segments customers into: worth re-engaging, not worth discounting (explicitly explained), already contacted recently (skip).
- For each "worth re-engaging" customer, computes an offer size, checks it against the daily/campaign budget, and if approved, generates a Razorpay Payment Link.
- If total planned spend would exceed budget, agent **ranks customers by ROI and cuts the lowest-value offers first**, logging the cutoff decision.

### 5.3 Shared Budget & Policy Brain
- Hierarchical caps: **daily total cap → per-category cap → per-customer cap**.
- Configurable policy rules: minimum margin floor, max discount %, blacklist categories/items.
- All decisions (upsell or campaign) draw from and update the same live budget state.

### 5.4 Human-Gating & Approval Queue
- Any decision outside policy bounds is held, never silently executed.
- Merchant dashboard shows a pending-approval queue with the AI's proposed action and reasoning; one-click approve/reject.
- "Kill switch" — merchant can pause the entire agent instantly.

### 5.5 Audit Trail Dashboard
- Live, timeline-style log (not a raw table) of every decision:
  - What was proposed, the reasoning, the policy check result, approval status, and the resulting Razorpay order/payment link ID.
- "Replay" button — re-displays the full reasoning for any past decision on demand.
- Filterable by decision type (upsell / campaign), status (auto-approved / escalated / rejected).

### 5.6 Non-AI Safety Net (Hardcoded Sanity Layer)
- Independent of the LLM's reasoning, a deterministic rule layer performs a final sanity check on every proposed discount/action before it can reach Razorpay (e.g., reject any discount below cost price or above an absolute hard ceiling, regardless of what the AI "decided").
- This exists specifically to demonstrate "knowing when not to use AI" — the safety net is intentionally not AI-driven.

### 5.7 Failure Handling (minimum two demonstrated modes)
1. **Razorpay API failure/drop** — agent detects the failure, does not retry blindly (avoids double-charge risk), holds the order, informs the customer/merchant honestly, logs the incident, retries safely in the background.
2. **Bad/malformed AI decision** — the non-AI sanity layer (5.6) intercepts an unreasonable AI-proposed action (e.g., unrealistic discount) before it ever reaches Razorpay, and logs the rejection as a caught anomaly.
3. *(Stretch)* **Budget cap hit mid-campaign** — agent halts remaining sends, reports how many customers were skipped and why.

---

## 6. Stretch / "Faadu" Enhancements (build if time allows, in priority order)

| # | Feature | Value |
|---|---|---|
| 1 | Confidence/risk score on every AI decision (not just approve/reject) | Makes gating logic feel intelligent, not just threshold-based |
| 2 | Session memory — agent stops repeating a declined offer to the same customer same day | Concrete "AI knows when not to act" proof |
| 3 | Revenue-recovered live counter ("AI-driven revenue so far: ₹X") | Instant, visible ROI story for judges |
| 4 | "Villain scenario" — customer attempts manipulation (e.g., "give me 99% off or I'll leave a bad review"); agent logs and refuses | Memorable AI-judgment moment, cheap to build |
| 5 | Aggressive vs Safe mode toggle, replayed side-by-side on the same session | Visually proves policy-driven behavior, not hardcoded output |
| 6 | CFO-style reasoning ("this costs 3.5% of this customer's LTV, historically improves repeat-purchase odds ~20%") | Makes reasoning feel business-grounded, not just arithmetic |
| 7 | Voice narration of agent reasoning during live demo | Pure demo polish, near-zero build cost |

---

## 7. System Architecture (High Level)

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Checkout Event  │ --> │                  │     │                   │
│  (upsell trigger)│     │   Reasoning /    │     │  Policy & Budget   │
└─────────────────┘     │   LLM Agent      │ --> │  Engine (rules,    │
┌─────────────────┐     │   Layer          │     │  hard caps, non-AI │
│ Campaign Scanner │ --> │                  │     │  sanity checks)    │
│ (scheduled/manual│     └──────────────────┘     └─────────┬─────────┘
└─────────────────┘                                          │
                                          ┌───────────────────┼───────────────────┐
                                          │                   │                   │
                                   Auto-approved         Escalated to        Rejected
                                   → Razorpay API         Human Approval      (logged only)
                                   (Order / Payment       Queue → then
                                   Link, test mode)       Razorpay API
                                          │                   │
                                          └─────────┬─────────┘
                                                     ▼
                                          Audit Trail / Dashboard
                                          (timeline, replay, kill switch)
```

---

## 8. Razorpay APIs Used (Test Mode)

- **Orders API** — create orders for approved upsell add-ons.
- **Payment Links API** — generate win-back campaign offers.
- **Payments API** — check payment status, detect failures for the recovery/failure-handling demo.
- **Webhooks** — listen for payment success/failure events to trigger failure-handling logic.
- *(All calls in Razorpay test mode; no real money moves.)*

---

## 9. Success Metrics (for demo/evaluation)

- % of upsell offers auto-approved vs escalated vs rejected, shown live.
- Total simulated "revenue recovered" via agent actions.
- At least 2 distinct failure scenarios triggered and gracefully handled live.
- Full audit trail visible and replayable for every decision made during the demo.
- At least one clear instance of the agent choosing not to act, with reasoning shown.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM reasoning is inconsistent/unreliable live | Non-AI sanity layer (5.6) as a hard backstop regardless of LLM output |
| Demo complexity causes live failures (bad, unplanned kind) | Stage the two failure demos deliberately and rehearse; keep core flow simple |
| Scope creep from "faadu" stretch features | Core features (5.1–5.7) are the pass/fail bar; stretch features (Section 6) are cut first if time is short |
| Judges question realism of reasoning (e.g., LTV %, ROI numbers) | Frame estimated figures explicitly as illustrative business logic, not claimed real ML output |

---

## 11. Build Priority Order

1. Policy & Budget Engine + non-AI sanity layer (the backbone — everything else depends on this).
2. Real-time upsell engine (Hand 1) with live reasoning trace.
3. Audit trail dashboard (timeline view).
4. Razorpay integration (Orders API, test mode) for approved upsells.
5. Human approval queue + kill switch.
6. Failure handling demo #1 (Razorpay drop/retry logic).
7. Failure handling demo #2 (bad AI decision caught by sanity layer).
8. Campaign agent (Hand 2) with Payment Links.
9. Stretch features from Section 6, in listed priority order, as time allows.

---

*This PRD is scoped for a buildathon timeline: core sections (1–5, 7–9, 11) are the required deliverable; Section 6 items are explicitly optional and should be cut first under time pressure.*
