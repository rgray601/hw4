import type { ProductDetail, ProductSummary, Shopper } from './types.ts'

const TOKEN_KEY = 'campus-customs-token'

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') message = body.detail
    } catch {
      // The body was not JSON. Keep the status message.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

function authHeader(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type AuthPayload = { token: string; user: Shopper }

function remember(payload: AuthPayload): Shopper {
  localStorage.setItem(TOKEN_KEY, payload.token)
  return payload.user
}

export function fetchProducts(signal?: AbortSignal): Promise<ProductSummary[]> {
  return fetch('/api/products', { signal }).then((response) =>
    readJson<ProductSummary[]>(response),
  )
}

export function fetchProduct(
  productId: string,
  signal?: AbortSignal,
): Promise<ProductDetail> {
  return fetch(`/api/products/${encodeURIComponent(productId)}`, { signal }).then(
    (response) => readJson<ProductDetail>(response),
  )
}

export function registerAccount(input: {
  firstName: string
  lastName: string
  email: string
  password: string
}): Promise<Shopper> {
  return fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      password: input.password,
    }),
  })
    .then((response) => readJson<AuthPayload>(response))
    .then(remember)
}

export function loginAccount(email: string, password: string): Promise<Shopper> {
  return fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => readJson<AuthPayload>(response))
    .then(remember)
}

export function fetchMe(): Promise<Shopper | null> {
  if (!localStorage.getItem(TOKEN_KEY)) return Promise.resolve(null)
  return fetch('/api/me', { headers: authHeader() }).then(async (response) => {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    return readJson<Shopper>(response)
  })
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export type ChatProduct = {
  product_id: string
  name: string
  garment_type: string
  description: string
  price: number
  image_url: string
}

export type ChatReply = {
  reply: string
  products: ChatProduct[]
}

export type StoredChatMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  products: ChatProduct[]
}

export function fetchChatHistory(): Promise<StoredChatMessage[]> {
  return fetch('/api/chat/history', { headers: authHeader() }).then((response) =>
    readJson<StoredChatMessage[]>(response),
  )
}

export function sendChatMessage(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  page: { path: string; product_id: string | null },
): Promise<ChatReply> {
  return fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ message, history, page }),
  }).then((response) => readJson<ChatReply>(response))
}
