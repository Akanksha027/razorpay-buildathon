# Profit Pilot — Product Requirements Document (v2, Final Concrete Build)

**Razorpay AI Buildathon Submission**
**Track:** Grows a Merchant's Sales (Smart Upsells + Automated Campaigns)

---

## 1. What We Are Building, In One Line

**One website with two parts**: a small demo storefront where a customer shops, and a merchant dashboard where an AI sales agent's decisions, approvals, budget, and logs are visible — with every payment action running through Razorpay in test mode.

---

## 2. Problem Statement

Merchants lose revenue two ways: they don't consistently upsell at checkout, and they don't follow up with lapsed customers effectively. Letting AI make these calls automatically is risky without guardrails — merchants need proof the AI can't overspend, can't act without oversight when needed, and can't silently fail.

Profit Pilot demonstrates an AI agent that grows sales through upsells and win-back campaigns, while every action is bounded by hard budget rules, logged for full transparency, and gracefully recovers from failure.

---

## 3. The Two Parts of the System

### Part A — Demo Storefront (customer-facing)
A simple mock e-commerce page:
- 4–5 sample products with images, names, prices.
- "Add to Cart" buttons.
- A cart view and a "Checkout" button.
- This exists purely as a realistic stage for the AI agent to operate in — it does not need to be a polished, full-featured store.

### Part B — Merchant Dashboard (owner/judge-facing)
A separate page/section showing:
- Live activity feed (audit log) of every AI decision.
- Approval queue for anything the AI isn't allowed to do automatically.
- Budget & policy settings (sliders/inputs for caps).
- Campaign view (list of past customers, who was targeted/skipped and why).
- Kill switch to pause the agent entirely.

Both parts run against the **same backend** — one AI reasoning layer, one rule-checking layer, one database of logs, one Razorpay integration.

---

## 4. Step-by-Step: What Happens When a Customer Shops (Upsell Flow)

1. Customer opens the demo storefront.
2. Customer adds a product to their cart (e.g., "Running Shoes ₹2000").
3. The system immediately sends this cart event to the **AI reasoning layer**, which decides: should we offer something extra, and at what discount? (e.g., "Suggest Socks, ₹99, 10% off — margin allows it, budget allows it.")
4. This proposal goes to the **Rule-Checker** (plain code, not AI) which verifies:
   - Is the discount within the allowed max %?
   - Is the price still above the cost/margin floor?
   - Is there enough budget left (daily / category / per-customer)?
5. **If it passes all checks:**
   - Customer sees a popup: "Add Socks for ₹99 (10% off)?"
   - If they accept, the system calls **Razorpay's Orders API (test mode)** to create the order for that item.
   - Budget is reduced by that amount.
6. **If it fails any check (or is borderline):**
   - Nothing is shown to the customer yet.
   - It goes into the merchant dashboard's **Approval Queue** with the AI's reasoning attached.
   - Merchant clicks Approve or Reject.
   - If approved → proceeds to Razorpay Orders API, same as step 5.
   - If rejected → logged, customer never sees the offer.
7. Every step above — regardless of outcome — is written to the **audit log** with a timestamp, the AI's reasoning, the check result, and the Razorpay order ID if one was created.

---

## 5. Step-by-Step: What Happens for the Campaign Agent (No Live Shop Needed)

1. Dashboard shows a list of "past customers" (sample data — order history, last order date, order value).
2. Merchant clicks "Run Campaign" (or it runs automatically for the demo).
3. AI reasoning layer looks at each customer and decides one of three things:
   - **Target** — worth a win-back offer, with a reasoning and offer size.
   - **Skip (not worth it)** — reasoning shown (e.g., "one-time low-value order").
   - **Skip (already contacted)** — avoid repeat offers.
4. Each proposed offer goes through the same **Rule-Checker** against the campaign budget.
5. If total proposed offers exceed the remaining campaign budget, the system **ranks them and cuts the lowest-value ones**, logging why each cut customer was skipped.
6. For every approved offer, the system calls **Razorpay's Payment Links API (test mode)** to generate a link (displayed/logged in the demo rather than actually texted out).
7. Every customer evaluated — targeted or skipped, and why — appears in the campaign view and the audit log.

---

## 6. Failure Handling (Must Demonstrate at Least Two)

### Failure 1 — Razorpay is down / call fails
- System detects the failed API call.
- Does **not** blindly retry (to avoid risk of double-charging).
- Marks the order "held — retrying," shows an honest status instead of crashing, logs the incident.
- Retries safely in the background after checking current status first.
- **Demo trigger:** a "Simulate Outage" button on the dashboard that fakes this failure live.

### Failure 2 — The AI proposes something unreasonable
- E.g., AI suggests a 90% discount due to a reasoning glitch.
- The **Rule-Checker** (non-AI, hardcoded) catches this before it ever reaches Razorpay — this layer doesn't trust the AI's math, it independently re-verifies every proposal.
- Logged as a blocked anomaly, never enters the approval queue or Razorpay.

### Failure 3 (stretch) — Campaign budget runs out mid-run
- Already covered by the ranking/cutoff logic in Section 5, Step 5 — this is graceful degradation shown as a normal outcome, not a crash.

---

## 7. Full System Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│  PART A: Storefront  │        │  PART B: Dashboard    │
│  (customer shops)    │        │  (merchant/judge view)│
└──────────┬───────────┘        └───────────┬───────────┘
           │  cart events                    │  approvals, settings
           ▼                                 ▼
        ┌───────────────────────────────────────┐
        │           Shared Backend               │
        │                                         │
        │  1. AI Reasoning Layer (LLM)            │
        │     → proposes offer + reasoning        │
        │                                         │
        │  2. Rule-Checker (deterministic code)   │
        │     → approves / escalates / blocks     │
        │                                         │
        │  3. Razorpay Integration (test mode)    │
        │     → Orders API / Payment Links API    │
        │                                         │
        │  4. Audit Log Storage                   │
        │     → every decision, every path        │
        └───────────────────────────────────────┘
```

---

## 8. Razorpay APIs Used (Test Mode Only)

- **Orders API** — create an order when an upsell is approved (auto or by merchant).
- **Payment Links API** — generate win-back campaign offers.
- **Payments API** — check payment status, used in the failure-handling demo.
- **Webhooks** — detect payment success/failure events.

No real money moves at any point — this is entirely Razorpay's test/sandbox environment.

---

## 9. Build Order (What To Build First)

1. **Rule-Checker (the brain's guardrails)** — plain code, no AI, hardcoded budget/margin/discount limits. Build this first because everything else depends on it.
2. **AI Reasoning Layer** — connect an LLM that takes cart/customer context and outputs a proposed action + reasoning, in a structured format the Rule-Checker can read.
3. **Demo Storefront (Part A)** — basic product list, cart, checkout button, wired to trigger Step 4 (AI reasoning) on "Add to Cart."
4. **Dashboard (Part B)** — activity feed, approval queue, budget settings, campaign view, kill switch.
5. **Razorpay Integration** — wire in Orders API and Payment Links API in test mode, only called after approval.
6. **Failure Handling** — build the "Simulate Outage" button and the bad-AI-decision catch, and rehearse triggering both live.
7. **Stretch features** (from the earlier faadu list) — only after 1–6 are solid and working end to end.

---

## 10. What Success Looks Like In The Demo

- A judge watches you add an item to the storefront cart, sees the AI's reasoning appear, sees an offer either auto-approve or land in the approval queue.
- A judge sees you approve/reject something live on the dashboard.
- A judge sees the budget gauge move as offers are approved.
- A judge sees you trigger a Razorpay outage, and the system handles it gracefully instead of crashing.
- A judge sees you trigger (or find in the log) a moment where the AI's own bad decision was caught and blocked before reaching Razorpay.
- A judge can click any log entry and see exactly why the AI did what it did.
