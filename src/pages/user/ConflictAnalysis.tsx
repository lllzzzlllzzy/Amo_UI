import { useState, useRef, useEffect } from 'react'
import UserLayout from '../../components/user/UserLayout'
import { streamConflictAnalysis, streamConflictFollowup, ERR_INSUFFICIENT_CREDITS } from '../../lib/api'

type Phase = 'input' | 'streaming' | 'done'

const SHADOW = 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px'

const SS_KEY = 'amo_conflict'

function loadSession(): { phase: Phase; result: string; followupAnswers: { q: string; a: string }[]; description: string; background: string } {
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { phase: 'input', result: '', followupAnswers: [], description: '', background: '' }
}

function saveSession(phase: Phase, result: string, followupAnswers: { q: string; a: string }[], description: string, background: string) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ phase, result, followupAnswers, description, background }))
  } catch { /* ignore */ }
}

export default function ConflictAnalysis() {
  const session = loadSession()
  const [description, setDescription] = useState(session.description)
  const [background, setBackground] = useState(session.background)
  const [phase, setPhase] = useState<Phase>(session.phase === 'streaming' ? 'input' : session.phase)
  const [result, setResult] = useState(session.result)
  const [error, setError] = useState('')
  const resultBuf = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)

  /* followup state */
  const [followupQ, setFollowupQ] = useState('')
  const [followupAnswers, setFollowupAnswers] = useState<{ q: string; a: string }[]>(session.followupAnswers)
  const [followupHistory, setFollowupHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [followupStreaming, setFollowupStreaming] = useState(false)
  const followupBuf = useRef('')

  useEffect(() => {
    if (phase !== 'input') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result, phase, followupAnswers])

  // persist to sessionStorage whenever key state changes
  useEffect(() => {
    saveSession(phase, result, followupAnswers, description, background)
  }, [phase, result, followupAnswers, description, background])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('请描述冲突情况'); return }

    setError('')
    setPhase('streaming')
    resultBuf.current = ''
    setResult('')
    setFollowupAnswers([])
    setFollowupHistory([])

    await streamConflictAnalysis(description.trim(), background.trim(), {
      onDelta(delta) {
        resultBuf.current += delta
        setResult(resultBuf.current)
      },
      onDone() {
        setPhase('done')
      },
      onError(msg) {
        setError(msg)
        setPhase(msg === ERR_INSUFFICIENT_CREDITS ? 'done' : 'input')
      },
    })
  }

  async function handleFollowup() {
    if (!followupQ.trim() || followupStreaming) return
    const q = followupQ.trim()
    setFollowupQ('')
    setError('')
    setFollowupStreaming(true)
    followupBuf.current = ''
    setFollowupAnswers(prev => [...prev, { q, a: '' }])

    await streamConflictFollowup(q, result, description.trim() || undefined, followupHistory, {
      onDelta(delta) {
        followupBuf.current += delta
        setFollowupAnswers(prev => {
          const next = [...prev]
          next[next.length - 1] = { q, a: followupBuf.current }
          return next
        })
      },
      onDone() {
        setFollowupHistory(prev => [
          ...prev,
          { role: 'user', content: q },
          { role: 'assistant', content: followupBuf.current },
        ])
        setFollowupStreaming(false)
      },
      onError(msg) { setFollowupStreaming(false); setError(msg) },
    })
  }

  function handleReset() {
    sessionStorage.removeItem(SS_KEY)
    setPhase('input')
    setResult('')
    setDescription('')
    setBackground('')
    setFollowupAnswers([])
    setFollowupHistory([])
  }

  return (
    <UserLayout>
      {phase === 'input' ? (
        <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: SHADOW }}>
          <h2 className="text-[22px] font-semibold text-[#222] tracking-[-0.44px] mb-1">冲突分析</h2>
          <p className="text-sm text-[#6a6a6a] mb-5">描述一次争吵或冲突，AI 会分析双方诉求并给出建议</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-[#222] mb-1">冲突描述</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="描述发生了什么，你们各自说了什么、做了什么..."
                rows={5}
                maxLength={2000}
                className="w-full border border-[#c1c1c1] rounded-lg px-4 py-3 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition resize-none"
              />
              <p className="text-xs text-[#6a6a6a] mt-1 text-right">{description.length}/2000</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#222] mb-1">背景信息（可选）</label>
              <textarea
                value={background}
                onChange={e => setBackground(e.target.value)}
                placeholder="关系状况、在一起多久、平时相处模式等..."
                rows={2}
                className="w-full border border-[#c1c1c1] rounded-lg px-4 py-3 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition resize-none"
              />
            </div>

            {error && <p className="text-xs text-[#c13515]">{error}</p>}

            <button
              type="submit"
              className="w-full bg-[#222] text-white rounded-lg py-3 text-base font-medium hover:bg-[#E8334A] active:scale-[0.98] transition-all"
            >
              开始分析（10 credits）
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Analysis result */}
          <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: SHADOW }}>
            <h2 className="text-[20px] font-semibold text-[#222] tracking-[-0.18px] mb-4">分析结果</h2>
            <div className="text-sm text-[#222] leading-relaxed whitespace-pre-wrap">
              {result}
              {phase === 'streaming' && (
                <span className="inline-block w-1.5 h-4 bg-[#E8334A] rounded-sm ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>

          {/* Followup section */}
          {phase === 'done' && (
            <div className="bg-white rounded-[20px] p-6" style={{ boxShadow: SHADOW }}>
              <h3 className="text-[18px] font-semibold text-[#222] tracking-[-0.18px] mb-3">追问</h3>

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
                  placeholder="对分析结果有疑问？输入追问..."
                  maxLength={1000}
                  className="flex-1 border border-[#c1c1c1] rounded-lg px-4 py-2.5 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition"
                />
                <button
                  onClick={handleFollowup}
                  disabled={followupStreaming || !followupQ.trim()}
                  className="sm:w-auto w-full px-4 py-2.5 bg-[#222] text-white rounded-lg text-sm font-medium hover:bg-[#E8334A] transition-colors disabled:opacity-50"
                >
                  追问（5 credits）
                </button>
              </div>
              {error && error !== ERR_INSUFFICIENT_CREDITS && <p className="text-xs text-[#c13515] mt-2">{error}</p>}
            </div>
          )}

          {error === ERR_INSUFFICIENT_CREDITS && (
            <div className="bg-[#fff0f3] border border-[#E8334A]/30 rounded-[16px] px-5 py-4 text-sm text-[#c13515]">
              额度不足，请购买新卡密后重试
            </div>
          )}

          {phase === 'done' && (
            <button
              onClick={handleReset}
              className="self-center px-6 py-2.5 rounded-lg text-sm font-medium border border-[#c1c1c1] text-[#222] hover:border-[#222] hover:bg-[#f2f2f2] transition"
            >
              重新分析
            </button>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </UserLayout>
  )
}
