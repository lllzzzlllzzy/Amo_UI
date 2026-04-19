const BASE_URL = 'http://localhost:3000'

const TOKEN_KEY = 'amo_admin_token'

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

// 401 callback — set by AdminPage on mount
let onUnauthorized: (() => void) | null = null
export function registerUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token ?? '',
      ...options.headers,
    },
  })
  if (res.status === 401) {
    clearToken()
    onUnauthorized?.()
    throw new Error('401')
  }
  return res
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Card {
  code: string
  credits: number
  total: number
  used: number
  created_at: number
  expires_at: number | null
}

export interface GenerateResult {
  count: number
  credits_per_card: number
  expires_at: number | null
  codes: string[]
}

export interface GenerateParams {
  count: number
  credits: number
  expires_at: number | null
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function generateCards(params: GenerateParams): Promise<GenerateResult> {
  const res = await adminFetch('/admin/cards', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error ?? '请求失败')
  }
  return res.json()
}

export async function fetchCards(): Promise<Card[]> {
  const res = await adminFetch('/admin/cards')
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error ?? '请求失败')
  }
  const data = await res.json()
  return data.cards
}
