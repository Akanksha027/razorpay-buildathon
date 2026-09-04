"use client"

import { useState } from "react"

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "What is Profit Pilot?",
    answer:
      "Profit Pilot is an AI sales growth agent for merchants. It proposes checkout upsells and win-back campaigns, then a non-AI rule-checker bounds every decision with margin floors, budget caps, and confidence thresholds — before any Razorpay call.",
  },
  {
    question: "How does the safety layer work?",
    answer:
      "Gemini proposes an offer with reasoning and a confidence score. A deterministic sanity + policy engine then auto-approves, escalates to your queue, or blocks the action. Low AI confidence forces escalation even when the numbers would otherwise pass — a second, independent safety axis.",
  },
  {
    question: "Where do payments happen?",
    answer:
      "Approved upsells create Razorpay Orders (test mode). Campaign offers create Razorpay Payment Links. Failures are logged with safe retry — the agent never silently charges a customer when the gateway is down.",
  },
  {
    question: "Can I change the rules live?",
    answer:
      "Yes. The Live Policy Editor lets you drag margin floor, daily budget, per-customer cap, max discount, and confidence threshold. The next decision on the storefront uses the new rules immediately — ideal for judge demos.",
  },
  {
    question: "What is counterfactual replay?",
    answer:
      "For any logged decision you can compare Profit Pilot against naive baselines (always approve, or flat 10%). You see exactly where the agent saved money or avoided a bad offer — not just a revenue counter.",
  },
  {
    question: "How do I start the demo?",
    answer:
      "Log in to open the merchant dashboard. Use Checkout Demo for the SweetDrip storefront, Policies to change guardrails mid-demo, Approvals for human-in-the-loop, and Campaigns to run a win-back scan.",
  },
]

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  return (
    <div className="w-full flex justify-center items-start">
      <div className="flex-1 px-4 md:px-12 py-16 md:py-20 flex flex-col lg:flex-row justify-start items-start gap-6 lg:gap-12">
        {/* Left Column - Header */}
        <div className="w-full lg:flex-1 flex flex-col justify-center items-start gap-4 lg:py-5">
          <div className="w-full flex flex-col justify-center text-[#49423D] font-semibold leading-tight md:leading-[44px] font-sans text-4xl tracking-tight">
            Frequently Asked Questions
          </div>
          <div className="w-full text-[#605A57] text-base font-normal leading-7 font-sans">
            Guardrails, Gemini reasoning, Razorpay payments —
            <br className="hidden md:block" />
            everything merchants ask before trusting an AI agent.
          </div>
        </div>

        {/* Right Column - FAQ Items */}
        <div className="w-full lg:flex-1 flex flex-col justify-center items-center">
          <div className="w-full flex flex-col">
            {faqData.map((item, index) => {
              const isOpen = openItems.includes(index)

              return (
                <div key={index} className="w-full border-b border-[rgba(73,66,61,0.16)] overflow-hidden">
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-5 py-[18px] flex justify-between items-center gap-5 text-left hover:bg-[rgba(73,66,61,0.02)] transition-colors duration-200"
                    aria-expanded={isOpen}
                  >
                    <div className="flex-1 text-[#49423D] text-base font-medium leading-6 font-sans">
                      {item.question}
                    </div>
                    <div className="flex justify-center items-center">
                      <ChevronDownIcon
                        className={`w-6 h-6 text-[rgba(73,66,61,0.60)] transition-transform duration-300 ease-in-out ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-5 pb-[18px] text-[#605A57] text-sm font-normal leading-6 font-sans">
                      {item.answer}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
