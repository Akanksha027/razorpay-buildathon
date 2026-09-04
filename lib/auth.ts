/** Demo auth for Profit Pilot (hackathon). */
const KEY = 'pp_auth'
const EMAIL_KEY = 'pp_email'
const NAME_KEY = 'pp_name'

const COMMON_SURNAMES = [
  'singh', 'kumar', 'sharma', 'patel', 'shah', 'gupta', 'nair', 'iyer',
  'reddy', 'rao', 'das', 'roy', 'khan', 'ali', 'verma', 'mehta', 'joshi',
  'chopra', 'kapoor', 'malhotra', 'agarwal', 'agrawal', 'jain', 'bansal',
]

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(KEY) === '1'
}

/** Keep only a first-name style label (never full email / local-part mash). */
export function toFirstName(raw: string): string {
  const cleaned = raw.trim().replace(/@.*/, '')
  if (!cleaned) return 'Merchant'

  // Prefer first token from "Akanksha Singh" / "akanksha.singh"
  let first = cleaned.split(/[._+\-\s]+/).filter(Boolean)[0] || cleaned
  first = first.replace(/\d+/g, '').toLowerCase()

  // akankshasingh → akanksha (common surname glued on)
  for (const surname of COMMON_SURNAMES) {
    if (first.length > surname.length + 2 && first.endsWith(surname)) {
      first = first.slice(0, -surname.length)
      break
    }
  }

  if (!first) return 'Merchant'
  return first.charAt(0).toUpperCase() + first.slice(1)
}

function deriveNameFromEmail(email: string): string {
  return toFirstName(email.split('@')[0] || 'merchant')
}

export function loginSession(email?: string, name?: string) {
  window.localStorage.setItem(KEY, '1')
  if (email) {
    window.localStorage.setItem(EMAIL_KEY, email)
    const display = name?.trim() ? toFirstName(name) : deriveNameFromEmail(email)
    window.localStorage.setItem(NAME_KEY, display)
  }
}

export function logoutSession() {
  window.localStorage.removeItem(KEY)
  window.localStorage.removeItem(EMAIL_KEY)
  window.localStorage.removeItem(NAME_KEY)
}

export function getSessionEmail(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(EMAIL_KEY) || 'merchant@northstar.in'
}

export function getSessionName(): string {
  if (typeof window === 'undefined') return 'Merchant'
  const stored = window.localStorage.getItem(NAME_KEY)
  if (stored) return toFirstName(stored)
  return deriveNameFromEmail(getSessionEmail())
}
