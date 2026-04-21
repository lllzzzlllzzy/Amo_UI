const BASE_URL = 'http://localhost:3000'

// ── Admin Token (sessionStorage) ──────────────────────────────────────────
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

// ── User Card Code (localStorage) ────────────────────────────────────────

const CARD_KEY = 'amo_card_code'

export function getCardCode(): string | null {
  return localStorage.getItem(CARD_KEY)
}

export function setCardCode(code: string) {
  localStorage.setItem(CARD_KEY, code)
}

export function clearCardCode() {
  localStorage.removeItem(CARD_KEY)
}

let onUserUnauthorized: (() => void) | null = null
export function registerUserUnauthorizedHandler(fn: () => void) {
  onUserUnauthorized = fn
}

async function userFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const code = getCardCode()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${code ?? ''}`,
      ...options.headers,
    },
  })
  if (res.status === 401) {
    clearCardCode()
    onUserUnauthorized?.()
    throw new Error('401')
  }
  if (res.status === 402) {
    throw new Error('额度不足，请购买新卡密')
  }
  return res
}

// ── User Types ────────────────────────────────────────────────────────────

export interface VerifyResult {
  valid: boolean
  credits?: number
  total?: number
}

export interface BalanceResult {
  credits: number
}

export interface AnalysisBackground {
  self_info?: { name?: string; age?: number; notes?: string }
  partner_info?: { name?: string; age?: number; notes?: string }
  relationship?: string
}

export interface AnalysisMessage {
  speaker: 'self' | 'partner'
  text: string
}

export interface SubmitAnalysisParams {
  background?: AnalysisBackground
  messages: AnalysisMessage[]
}

export interface EmotionSegment {
  index: number
  speaker: 'self' | 'partner'
  emotion: string
  intensity: number
}

export interface TurningPoint {
  index: number
  description: string
}

export interface RiskFlag {
  flag_type: 'cold_violence' | 'pua' | 'gaslighting' | 'manipulation'
  severity: 'low' | 'medium' | 'high'
  evidence_indices: number[]
  evidence_text: string
  explanation: string
}

export interface Suggestion {
  context: string
  original: string | null
  rewrite: string
  rationale: string
}

export interface AnalysisReport {
  emotion_trajectory: {
    segments: EmotionSegment[]
    turning_points: TurningPoint[]
    summary: string
  }
  communication_patterns: {
    self_attachment_style: string
    partner_attachment_style: string
    power_dynamic: string
    failure_modes: string[]
    summary: string
  }
  risk_flags: RiskFlag[]
  core_needs: {
    self_surface: string
    self_deep: string
    partner_surface: string
    partner_deep: string
  }
  suggestions: Suggestion[]
}

export interface PollResult {
  status: 'processing' | 'done' | 'failed'
  report?: AnalysisReport
  error?: string
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

// ── User API Calls ────────────────────────────────────────────────────────

export async function verifyCard(code: string): Promise<VerifyResult> {
  const res = await fetch(`${BASE_URL}/cards/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  return res.json()
}

export async function fetchBalance(): Promise<number> {
  const res = await userFetch('/cards/balance')
  if (!res.ok) throw new Error('查询余额失败')
  const data: BalanceResult = await res.json()
  return data.credits
}

export async function submitAnalysis(params: SubmitAnalysisParams): Promise<{ task_id: string }> {
  const res = await userFetch('/analysis', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '提交失败' }))
    throw new Error(err.error ?? '提交失败')
  }
  return res.json()
}

export async function pollAnalysis(taskId: string): Promise<PollResult> {
  const res = await userFetch(`/analysis/${taskId}`)
  if (!res.ok) throw new Error('查询失败')
  return res.json()
}

// ── SSE Stream ────────────────────────────────────────────────────────────

export interface StreamCallbacks {
  onDelta: (text: string) => void
  onDone: () => void
  onError: (msg: string) => void
}

export async function streamRequest(
  path: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks,
): Promise<void> {
  const code = getCardCode()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${code ?? ''}`,
    },
    body: JSON.stringify(body),
  })

  if (res.status === 401) {
    clearCardCode()
    onUserUnauthorized?.()
    callbacks.onError('卡密无效或已过期')
    return
  }
  if (res.status === 402) {
    callbacks.onError('额度不足，请购买新卡密')
    return
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    callbacks.onError(err.error ?? '请求失败')
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let nextIsError = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (line === 'event: done') {
        callbacks.onDone()
        return
      }
      if (line === 'event: error') {
        nextIsError = true
        continue
      }
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (nextIsError) {
          callbacks.onError(data || '未知错误')
          nextIsError = false
          return
        }
        if (!data) continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.delta) callbacks.onDelta(parsed.delta)
        } catch { /* ignore malformed */ }
      }
    }
  }
  callbacks.onDone()
}

export function streamFollowup(question: string, report: AnalysisReport, callbacks: StreamCallbacks) {
  return streamRequest('/analysis/followup', { question, report }, callbacks)
}

export function streamEmotionalChat(message: string, history: ChatHistoryItem[], callbacks: StreamCallbacks) {
  return streamRequest('/emotional/chat', { message, history }, callbacks)
}

export function streamConflictAnalysis(description: string, background: string, callbacks: StreamCallbacks) {
  return streamRequest('/conflict/analyze', { description, background }, callbacks)
}

export function streamConflictFollowup(question: string, analysis: string, description: string | undefined, callbacks: StreamCallbacks) {
  return streamRequest('/conflict/followup', { question, analysis, description }, callbacks)
}
