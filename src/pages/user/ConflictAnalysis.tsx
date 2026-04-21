import { useState, useRef, useEffect } from 'react'
import UserLayout from '../../components/user/UserLayout'
import { streamConflictAnalysis, streamConflictFollowup } from '../../lib/api'

type Phase = 'input' | 'streaming' | 'done'

const SHADOW = 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px'

export default function ConflictAnalysis() {
  const [description, setDescription] = useState('')
  const [background, setBackground] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const resultBuf = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)

  /* followup state */
  const [followupQ, setFollowupQ] = useState('')
  const [followupAnswers, setFollowupAnswers] = useState<{ q: string; a: string }[]>([])
  const [followupStreaming, setFollowupStreaming] = useState(false)
  const followupBuf = useRef('')

  useEffect(() => {
    if (phase !== 'input') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result, phase, followupAnswers])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('请描述冲突情况'); return }

    setError('')
    setPhase('streaming')
    resultBuf.current = ''
    setResult('')
    setFollowupAnswers([])

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
        setPhase('input')
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

    await streamConflictFollowup(q, result, description.trim() || undefined, {
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

  function handleReset() {
    setPhase('input')
    setResult('')
    setDescription('')
    setBackground('')
    setFollowupAnswers([])
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
              className="w-full bg-[#222] text-white rounded-lg py-3 text-base font-medium hover:bg-[#ff385c] active:scale-[0.98] transition-all"
            >
              开始分析（8 credits）
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
                <span className="inline-block w-1.5 h-4 bg-[#ff385c] rounded-sm ml-0.5 animate-pulse align-middle" />
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
                      <span className="inline-block w-1.5 h-4 bg-[#ff385c] rounded-sm ml-0.5 animate-pulse align-middle" />
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
                  className="sm:w-auto w-full px-4 py-2.5 bg-[#222] text-white rounded-lg text-sm font-medium hover:bg-[#ff385c] transition-colors disabled:opacity-50"
                >
                  追问（5 credits）
                </button>
              </div>
              {error && <p className="text-xs text-[#c13515] mt-2">{error}</p>}
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
