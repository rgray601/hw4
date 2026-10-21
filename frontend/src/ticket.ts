const TICKET_KEY = 'cc-golden-ticket'

export function ensureTicket(ids: string[]): string | null {
  const existing = sessionStorage.getItem(TICKET_KEY)
  if (existing) return existing
  if (ids.length === 0) return null
  const pick = ids[Math.floor(Math.random() * ids.length)]
  sessionStorage.setItem(TICKET_KEY, pick)
  return pick
}

export function isGolden(productId: string): boolean {
  return sessionStorage.getItem(TICKET_KEY) === productId
}
