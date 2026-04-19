import { useState } from 'react'
import { generateCards, type GenerateResult } from '../../lib/api'

const PRESET_CREDITS = [30, 150, 400]

interface Props {
  onGenerated: (result: GenerateResult) => void
  onRefreshList: () => void
}

export default function GenerateForm({ onGenerated, onRefreshList }: Props) {
  const [count, setCount] = useState(1)
  const [creditsMode, setCreditsMode] = useState<'preset' | 'custom'>('preset')
  const [presetCredits, setPresetCredits] = useState(150)
  const [customCredits, setCustomCredits] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const credits = creditsMode === 'preset' ? presetCredits : parseInt(customCredits, 10)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!count || count < 1 || count > 100) {
      setError('数量需在 1-100 之间')
      return
    }
    if (!credits || credits <= 0) {
      setError('请输入有效额度')
      return
    }

    const expires_at = expiresAt
      ? Math.floor(new Date(expiresAt).getTime() / 1000)
      : null

    setLoading(true)
    try {
      const result = await generateCards({ count, credits, expires_at })
      onGenerated(result)
      onRefreshList()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="bg-white rounded-[20px] p-6"
      style={{ boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px' }}
    >
      <h2 className="text-[20px] font-semibold text-[#222] mb-4 tracking-[-0.18px]">生成卡密</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* 数量 */}
        <div>
          <label className="block text-sm font-medium text-[#222] mb-1">数量</label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={e => setCount(parseInt(e.target.value, 10))}
            className="w-full border border-[#c1c1c1] rounded-lg px-4 py-2.5 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition"
          />
        </div>

        {/* 额度 */}
        <div>
          <label className="block text-sm font-medium text-[#222] mb-1">每张额度</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {PRESET_CREDITS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setCreditsMode('preset'); setPresetCredits(c) }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                  creditsMode === 'preset' && presetCredits === c
                    ? 'bg-[#222] text-white border-[#222]'
                    : 'bg-white text-[#222] border-[#c1c1c1] hover:border-[#222]'
                }`}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCreditsMode('custom')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                creditsMode === 'custom'
                  ? 'bg-[#222] text-white border-[#222]'
                  : 'bg-white text-[#222] border-[#c1c1c1] hover:border-[#222]'
              }`}
            >
              自定义
            </button>
          </div>
          {creditsMode === 'custom' && (
            <input
              type="number"
              min={1}
              placeholder="输入额度数量"
              value={customCredits}
              onChange={e => setCustomCredits(e.target.value)}
              className="w-full border border-[#c1c1c1] rounded-lg px-4 py-2.5 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition"
            />
          )}
          <p className="text-xs text-[#6a6a6a] mt-1.5">
            参考：30 credits ≈ 9.9元 · 150 credits ≈ 29.9元 · 400 credits ≈ 59.9元
          </p>
        </div>

        {/* 过期时间 */}
        <div>
          <label className="block text-sm font-medium text-[#222] mb-1">过期时间（可选）</label>
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            className="w-full border border-[#c1c1c1] rounded-lg px-4 py-2.5 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition"
          />
          <p className="text-xs text-[#6a6a6a] mt-1">不填则永不过期</p>
        </div>

        {error && <p className="text-xs text-[#c13515]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#222] text-white rounded-lg py-3 text-base font-medium hover:bg-[#ff385c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : '生成卡密'}
        </button>
      </form>
    </div>
  )
}
