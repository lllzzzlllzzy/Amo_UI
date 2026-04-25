const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// ── Error code mapping ────────────────────────────────────────────────────
// Maps backend error patterns to [code, user-facing message]
export const ERR_INSUFFICIENT_CREDITS = 'ERR_INSUFFICIENT_CREDITS'

const ERROR_MAP: Array<[RegExp | string, string, string]> = [
  [/LLM\s*调用失败|error sending request|upstream|connect error/i, 'ERR_LLM_UPSTREAM',   'AI 服务暂时不可用，请稍后重试'],
  [/timeout|timed out|超时/i,                                       'ERR_TIMEOUT',         '请求超时，请稍后重试'],
  [/rate.?limit|too many requests|429/i,                            'ERR_RATE_LIMIT',      '请求过于频繁，请稍后重试'],
  [/context.?length|token.?limit|too long/i,                        'ERR_CONTEXT_TOO_LONG','输入内容过长，请精简后重试'],
  [/invalid.?key|authentication|api.?key/i,                         'ERR_LLM_AUTH',        'AI 服务配置异常，请联系管理员'],
  [/insufficient.?quota|quota.?exceeded/i,                          'ERR_LLM_QUOTA',       'AI 服务额度不足，请联系管理员'],
  [/database|db error|sql/i,                                        'ERR_DATABASE',        '服务器内部错误，请稍后重试'],
  [/parse|json|invalid.?response/i,                                 'ERR_PARSE',           '服务器返回数据异常，请重试'],
]

export function mapBackendError(raw: string): { code: string; message: string } {
  for (const [pattern, code, message] of ERROR_MAP) {
    if (typeof pattern === 'string' ? raw.includes(pattern) : pattern.test(raw)) {
      return { code, message }
    }
  }
  return { code: 'ERR_UNKNOWN', message: '服务异常，请稍后重试' }
}

function toUserError(raw: string): string {
  const { code, message } = mapBackendError(raw)
  console.error(`[${code}]`, raw)
  return `${message}（${code}）`
}

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
  if (!code) {
    onUserUnauthorized?.()
    throw new Error('401')
  }
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
    throw new Error(ERR_INSUFFICIENT_CREDITS)
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
  if (!res.ok) return { valid: false }
  return res.json()
}

export async function fetchBalance(): Promise<number> {
  const res = await userFetch('/cards/balance')
  if (!res.ok) throw new Error('查询余额失败')
  const data: BalanceResult = await res.json()
  return data.credits
}

export interface AnalysisSections {
  emotion_trajectory?: AnalysisReport['emotion_trajectory']
  communication_patterns?: AnalysisReport['communication_patterns']
  risk_flags?: AnalysisReport['risk_flags']
  core_needs?: AnalysisReport['core_needs']
  suggestions?: AnalysisReport['suggestions']
}

export interface AnalysisStreamCallbacks {
  onSection: (name: keyof AnalysisSections, data: AnalysisSections[keyof AnalysisSections]) => void
  onDone: () => void
  onError: (msg: string) => void
}

export async function submitAnalysis(params: SubmitAnalysisParams, callbacks: AnalysisStreamCallbacks): Promise<void> {
  const code = getCardCode()
  if (!code) {
    onUserUnauthorized?.()
    callbacks.onError('未登录')
    return
  }
  const res = await fetch(`${BASE_URL}/analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${code}`,
    },
    body: JSON.stringify(params),
  })

  if (res.status === 401) {
    clearCardCode()
    onUserUnauthorized?.()
    callbacks.onError('卡密无效或已过期')
    return
  }
  if (res.status === 402) {
    callbacks.onError(ERR_INSUFFICIENT_CREDITS)
    return
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '提交失败' }))
    callbacks.onError(toUserError(err.error ?? '提交失败'))
    return
  }
  if (!res.body) {
    callbacks.onError(toUserError('响应体为空'))
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let nextIsError = false
  let finished = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line === 'event: done') {
        finished = true
        callbacks.onDone()
        return
      }
      if (line === 'event: error') {
        nextIsError = true
        continue
      }
      if (line.startsWith('data: ') && line.length > 6) {
        const raw = line.slice(6)
        if (nextIsError) {
          finished = true
          callbacks.onError(toUserError(raw || '未知错误'))
          nextIsError = false
          return
        }
        try {
          const event = JSON.parse(raw)
          if (event.type === 'section') {
            callbacks.onSection(event.name, event.data)
          }
        } catch { /* ignore */ }
      }
    }
  }
  if (!finished) callbacks.onDone()
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
  if (!code) {
    onUserUnauthorized?.()
    callbacks.onError('未登录')
    return
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${code}`,
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
    callbacks.onError(ERR_INSUFFICIENT_CREDITS)
    return
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    callbacks.onError(toUserError(err.error ?? '请求失败'))
    return
  }

  if (!res.body) {
    callbacks.onError(toUserError('响应体为空'))
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let nextIsError = false
  let finished = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line === 'event: done') {
        finished = true
        callbacks.onDone()
        return
      }
      if (line === 'event: error') {
        nextIsError = true
        continue
      }
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        console.log('[streamRequest] data line:', JSON.stringify(data))
        if (nextIsError) {
          finished = true
          callbacks.onError(toUserError(data || '未知错误'))
          nextIsError = false
          return
        }
        if (!data) continue
        try {
          const parsed = JSON.parse(data)
          console.log('[streamRequest] parsed:', parsed)
          if (parsed.delta) callbacks.onDelta(parsed.delta)
        } catch (e) { console.warn('SSE JSON parse error:', e, 'raw:', data) }
      }
    }
  }
  if (!finished) callbacks.onDone()
}

export function streamFollowup(question: string, report: AnalysisReport, history: ChatHistoryItem[], callbacks: StreamCallbacks) {
  return streamRequest('/analysis/followup', { question, report, history }, callbacks)
}

export function streamEmotionalChat(message: string, history: ChatHistoryItem[], callbacks: StreamCallbacks) {
  return streamRequest('/emotional/chat', { message, history }, callbacks)
}

export function streamConflictAnalysis(description: string, background: string, callbacks: StreamCallbacks) {
  return streamRequest('/conflict/analyze', { description, background }, callbacks)
}

export function streamConflictFollowup(question: string, analysis: string, description: string | undefined, history: ChatHistoryItem[], callbacks: StreamCallbacks) {
  return streamRequest('/conflict/followup', { question, analysis, description, history }, callbacks)
}
