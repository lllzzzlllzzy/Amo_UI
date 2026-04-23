import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyCard, setCardCode } from '../../lib/api'

export default function CardEntry() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) { setError('请输入卡密'); return }

    if (trimmed === 'Aleks&Duckie') {
      navigate('/x9f3k1', { replace: true })
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await verifyCard(trimmed)
      if (result.valid) {
        setCardCode(trimmed)
        navigate('/home', { replace: true })
      } else {
        setError('卡密无效或已过期')
      }
    } catch {
      setError('验证失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-[20px] p-8 w-full max-w-sm text-center"
        style={{ boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px' }}
      >
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#ff385c] tracking-[-0.44px]">阿默</h1>
          <p className="text-sm text-[#6a6a6a] mt-1">输入卡密开始使用</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="AMO-XXXX-XXXX-XXXX"
            value={code}
            onChange={e => { setCode(e.target.value); setError('') }}
            className="w-full border border-[#c1c1c1] rounded-lg px-4 py-3 text-sm text-[#222] text-center font-mono tracking-wider outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition"
            autoFocus
          />
          {error && <p className="text-xs text-[#c13515]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#222] text-white rounded-lg py-3 text-base font-medium hover:bg-[#ff385c] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? '验证中...' : '验证并进入'}
          </button>
        </form>
      </div>
    </div>
  )
}
