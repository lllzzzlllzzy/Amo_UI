import { useState, useRef, useEffect } from 'react'
import UserLayout from '../../components/user/UserLayout'
import {
  submitAnalysis, pollAnalysis, streamFollowup,
  type AnalysisBackground, type AnalysisMessage, type AnalysisReport,
} from '../../lib/api'

type Phase = 'input' | 'polling' | 'report'

const SHADOW = 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 40
const POLL_MAX_FAILURES = 3

/* ── severity / flag helpers ── */
const severityColor: Record<string, string> = { low: '#F59E0B', medium: '#EF4444', high: '#7F1D1D' }
const severityLabel: Record<string, string> = { low: '低', medium: '中', high: '高' }
const flagLabel: Record<string, string> = {
  cold_violence: '冷暴力', pua: 'PUA', gaslighting: '煤气灯效应', manipulation: '情感操控',
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function Analysis() {
  const [phase, setPhase] = useState<Phase>('input')

  /* ── input state ── */
  const [showBg, setShowBg] = useState(false)
  const [selfName, setSelfName] = useState('')
  const [selfAge, setSelfAge] = useState('')
  const [selfNotes, setSelfNotes] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [partnerAge, setPartnerAge] = useState('')
  const [partnerNotes, setPartnerNotes] = useState('')
  const [relationship, setRelationship] = useState('')
  const [messages, setMessages] = useState<AnalysisMessage[]>([{ speaker: 'self', text: '' }])
  const [error, setError] = useState('')

  /* ── polling state ── */
  const [pollMsg, setPollMsg] = useState('正在分析中...')

  /* ── report state ── */
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [followupQ, setFollowupQ] = useState('')
  const [followupAnswers, setFollowupAnswers] = useState<{ q: string; a: string }[]>([])
  const [followupStreaming, setFollowupStreaming] = useState(false)
  const followupBuf = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (phase === 'report') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [followupAnswers, phase])

  /* ── message list helpers ── */
  function updateMsg(i: number, field: 'speaker' | 'text', val: string) {
    setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } as AnalysisMessage : m))
  }
  function addMsg() { setMessages(prev => [...prev, { speaker: 'self', text: '' }]) }
  function removeMsg(i: number) { setMessages(prev => prev.filter((_, idx) => idx !== i)) }

  /* ── submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validMsgs = messages.filter(m => m.text.trim())
    if (validMsgs.length === 0) { setError('请至少输入一条对话'); return }

    setError('')
    setPhase('polling')
    setPollMsg('正在提交...')

    const background: AnalysisBackground = {}
    if (showBg) {
      if (selfName || selfAge || selfNotes) background.self_info = { name: selfName || undefined, age: selfAge ? Number(selfAge) : undefined, notes: selfNotes || undefined }
      if (partnerName || partnerAge || partnerNotes) background.partner_info = { name: partnerName || undefined, age: partnerAge ? Number(partnerAge) : undefined, notes: partnerNotes || undefined }
      if (relationship) background.relationship = relationship
    }

    try {
      const { task_id } = await submitAnalysis({
        background: Object.keys(background).length > 0 ? background : undefined,
        messages: validMsgs,
      })
      setPollMsg('分析中，请稍候...')
      await doPoll(task_id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '提交失败')
      setPhase('input')
    }
  }

  async function doPoll(taskId: string) {
    let failures = 0
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      try {
        const data = await pollAnalysis(taskId)
        failures = 0
        if (data.status === 'done' && data.report) {
          setReport(data.report)
          setPhase('report')
          return
        }
        if (data.status === 'failed') {
          setError(data.error || '分析失败')
          setPhase('input')
          return
        }
      } catch {
        failures++
        if (failures >= POLL_MAX_FAILURES) {
          setError('网络异常，请检查连接后重试')
          setPhase('input')
          return
        }
      }
    }
    setError('分析超时，请重试')
    setPhase('input')
  }

  /* ── followup ── */
  async function handleFollowup() {
    if (!followupQ.trim() || !report || followupStreaming) return
    const q = followupQ.trim()
    setFollowupQ('')
    setFollowupStreaming(true)
    followupBuf.current = ''
    setFollowupAnswers(prev => [...prev, { q, a: '' }])

    await streamFollowup(q, report, {
      onDelta(delta) {
        followupBuf.current += delta
        setFollowupAnswers(prev => {
          const next = [...prev]
          next[next.length - 1] = { q, a: followupBuf.current }
          return next
        })
      },
      onDone() { setFollowupStreaming(false) },
      onError(msg) { setFollowupStreaming(false); setError(msg) },
    })
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /* RENDER                                                                */
  /* ══════════════════════════════════════════════════════════════════════ */

  if (phase === 'polling') {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-3 border-[#f2f2f2] border-t-[#E8334A] rounded-full animate-spin" />
          <p className="text-sm text-[#6a6a6a]">{pollMsg}</p>
        </div>
      </UserLayout>
    )
  }

  if (phase === 'report' && report) {
    return (
      <UserLayout>
        <div className="flex flex-col gap-5">
          {/* 1. Emotion Trajectory */}
          <Card title="情绪轨迹">
            <p className="text-sm text-[#6a6a6a] mb-3">{report.emotion_trajectory.summary}</p>
            <div className="flex flex-col gap-2">
              {report.emotion_trajectory.segments.map((seg, i) => {
                const isTurning = report.emotion_trajectory.turning_points.some(tp => tp.index === seg.index)
                return (
                  <div key={i} className={`p-2.5 rounded-lg ${isTurning ? 'bg-[#fff0f3]' : 'bg-[#f2f2f2]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-[14px] shrink-0 ${seg.speaker === 'self' ? 'bg-[#222] text-white' : 'bg-white text-[#222] border border-[#c1c1c1]'}`}>
                        {seg.speaker === 'self' ? '我' : '对方'}
                      </span>
                      <span className="text-sm text-[#222] font-medium">{seg.emotion}</span>
                      {isTurning && <span className="text-xs text-[#E8334A] font-medium ml-auto shrink-0">转折点</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#E8334A]" style={{ width: `${seg.intensity * 100}%` }} />
                      </div>
                      <span className="text-xs text-[#6a6a6a] w-8 text-right shrink-0">{Math.round(seg.intensity * 100)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {report.emotion_trajectory.turning_points.map((tp, i) => (
              <p key={i} className="text-xs text-[#E8334A] mt-2">转折点 #{tp.index + 1}：{tp.description}</p>
            ))}
          </Card>

          {/* 2. Communication Patterns */}
          <Card title="沟通模式">
            <div className="flex flex-wrap gap-2 mb-3">
              <Tag label={`我：${report.communication_patterns.self_attachment_style}`} />
              <Tag label={`对方：${report.communication_patterns.partner_attachment_style}`} />
              {report.communication_patterns.failure_modes.map(m => (
                <Tag key={m} label={m} secondary />
              ))}
            </div>
            <p className="text-sm text-[#6a6a6a] mb-2">{report.communication_patterns.power_dynamic}</p>
            <p className="text-sm text-[#222]">{report.communication_patterns.summary}</p>
          </Card>

          {/* 3. Risk Flags */}
          {report.risk_flags.length > 0 && (
            <Card title="风险标注">
              <div className="flex flex-col gap-3">
                {report.risk_flags.map((flag, i) => (
                  <RiskFlagItem key={i} flag={flag} />
                ))}
              </div>
            </Card>
          )}

          {/* 4. Core Needs */}
          <Card title="核心诉求">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeedColumn label="我" surface={report.core_needs.self_surface} deep={report.core_needs.self_deep} />
              <NeedColumn label="对方" surface={report.core_needs.partner_surface} deep={report.core_needs.partner_deep} />
            </div>
          </Card>

          {/* 5. Suggestions */}
          <Card title="建议">
            <div className="flex flex-col gap-3">
              {report.suggestions.map((s, i) => (
                <div key={i} className="bg-[#f2f2f2] rounded-[14px] p-4">
                  <p className="text-xs text-[#6a6a6a] mb-2">{s.context}</p>
                  {s.original && (
                    <p className="text-sm text-[#6a6a6a] line-through mb-1">"{s.original}"</p>
                  )}
                  <p className="text-sm text-[#222] font-medium mb-1">"{s.rewrite}"</p>
                  <p className="text-xs text-[#6a6a6a]">{s.rationale}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Followup */}
          <Card title="追问">
            {followupAnswers.map((fa, i) => (
              <div key={i} className="mb-4">
                <p className="text-sm font-medium text-[#222] mb-1">Q: {fa.q}</p>
                <div className="text-sm text-[#6a6a6a] whitespace-pre-wrap leading-relaxed">
                  {fa.a}
                  {followupStreaming && i === followupAnswers.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-[#E8334A] rounded-sm ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={followupQ}
                onChange={e => setFollowupQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFollowup()}
                placeholder="对报告有疑问？输入追问..."
                className="flex-1 border border-[#c1c1c1] rounded-lg px-4 py-2.5 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition"
              />
              <button
                onClick={handleFollowup}
                disabled={followupStreaming || !followupQ.trim()}
                className="sm:w-auto w-full px-4 py-2.5 bg-[#222] text-white rounded-lg text-sm font-medium hover:bg-[#E8334A] transition-colors disabled:opacity-50"
              >
                追问（3 credits）
              </button>
            </div>
            {error && <p className="text-xs text-[#c13515] mt-2">{error}</p>}
          </Card>
          <div ref={bottomRef} />
        </div>
      </UserLayout>
    )
  }

  /* ── INPUT PHASE ── */
  return (
    <UserLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Background toggle */}
        <div
          className="bg-white rounded-[20px] p-6"
          style={{ boxShadow: SHADOW }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[22px] font-semibold text-[#222] tracking-[-0.44px]">聊天记录分析</h2>
          </div>
          <p className="text-sm text-[#6a6a6a]">输入你们的对话，AI 会深度分析情绪和沟通模式</p>
        </div>

        {/* Background info */}
        <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: SHADOW }}>
          <button type="button" onClick={() => setShowBg(!showBg)} className="flex items-center gap-2 text-sm font-medium text-[#222]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showBg ? 'rotate-90' : ''}`}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            背景信息（可选，填写后分析更准确）
          </button>
          {showBg && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium text-[#222] mb-1">我的信息</legend>
                  <input placeholder="姓名" value={selfName} onChange={e => setSelfName(e.target.value)} className="input-field" />
                  <input placeholder="年龄" type="number" min={0} max={150} value={selfAge} onChange={e => setSelfAge(e.target.value)} className="input-field" />
                  <input placeholder="补充（性格、背景等）" value={selfNotes} onChange={e => setSelfNotes(e.target.value)} className="input-field" />
                </fieldset>
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium text-[#222] mb-1">对方信息</legend>
                  <input placeholder="姓名" value={partnerName} onChange={e => setPartnerName(e.target.value)} className="input-field" />
                  <input placeholder="年龄" type="number" min={0} max={150} value={partnerAge} onChange={e => setPartnerAge(e.target.value)} className="input-field" />
                  <input placeholder="补充（性格、背景等）" value={partnerNotes} onChange={e => setPartnerNotes(e.target.value)} className="input-field" />
                </fieldset>
              </div>
              <input placeholder="关系描述（如：恋爱中，交往8个月，异地）" value={relationship} onChange={e => setRelationship(e.target.value)} className="input-field" />
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: SHADOW }}>
          <h3 className="text-[18px] font-semibold text-[#222] tracking-[-0.18px] mb-3">对话内容</h3>
          <div className="flex flex-col gap-2.5">
            {messages.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => updateMsg(i, 'speaker', m.speaker === 'self' ? 'partner' : 'self')}
                  className={`shrink-0 mt-0.5 px-3 py-2 rounded-lg text-xs font-medium border transition active:scale-95 ${
                    m.speaker === 'self'
                      ? 'bg-[#222] text-white border-[#222]'
                      : 'bg-white text-[#222] border-[#c1c1c1]'
                  }`}
                >
                  {m.speaker === 'self' ? '我' : '对方'}
                </button>
                <textarea
                  value={m.text}
                  onChange={e => updateMsg(i, 'text', e.target.value)}
                  placeholder="输入这条消息..."
                  rows={1}
                  maxLength={500}
                  className="flex-1 border border-[#c1c1c1] rounded-lg px-3 py-2 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition resize-none"
                />
                {messages.length > 1 && (
                  <button type="button" onClick={() => removeMsg(i)} aria-label="删除消息" className="shrink-0 mt-1 w-8 h-8 flex items-center justify-center text-[#6a6a6a] hover:text-[#c13515] active:scale-95 transition">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addMsg} className="mt-3 text-sm text-[#6a6a6a] hover:text-[#222] transition">
            + 添加一条消息
          </button>
        </div>

        {error && <p className="text-xs text-[#c13515] text-center">{error}</p>}

        <button
          type="submit"
          className="w-full bg-[#222] text-white rounded-lg py-3 text-base font-medium hover:bg-[#E8334A] active:scale-[0.98] transition-all"
        >
          开始分析（20 credits）
        </button>
      </form>
    </UserLayout>
  )
}

/* ── Sub-components ── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: SHADOW }}>
      <h3 className="text-[20px] font-semibold text-[#222] tracking-[-0.18px] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Tag({ label, secondary }: { label: string; secondary?: boolean }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-[14px] ${
      secondary ? 'bg-[#f2f2f2] text-[#6a6a6a]' : 'bg-[#222] text-white'
    }`}>
      {label}
    </span>
  )
}

function RiskFlagItem({ flag }: { flag: AnalysisReport['risk_flags'][number] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[#f2f2f2] rounded-[14px] overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#f2f2f2]/40 transition">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: severityColor[flag.severity] }} />
        <span className="text-sm font-medium text-[#222]">{flagLabel[flag.flag_type] || flag.flag_type}</span>
        <span className="text-xs px-2 py-0.5 rounded-[14px] font-medium" style={{ backgroundColor: severityColor[flag.severity] + '20', color: severityColor[flag.severity] }}>
          {severityLabel[flag.severity]}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`ml-auto transition-transform ${open ? 'rotate-90' : ''}`}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm">
          <p className="text-[#222] mb-1">"{flag.evidence_text}"</p>
          <p className="text-[#6a6a6a]">{flag.explanation}</p>
        </div>
      )}
    </div>
  )
}

function NeedColumn({ label, surface, deep }: { label: string; surface: string; deep: string }) {
  return (
    <div className="bg-[#f2f2f2] rounded-[14px] p-4">
      <p className="text-sm font-medium text-[#222] mb-2">{label}</p>
      <p className="text-xs text-[#6a6a6a] mb-1">表面诉求</p>
      <p className="text-sm text-[#222] mb-2">{surface}</p>
      <p className="text-xs text-[#6a6a6a] mb-1">深层需求</p>
      <p className="text-sm text-[#222]">{deep}</p>
    </div>
  )
}
