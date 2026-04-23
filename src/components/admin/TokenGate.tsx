import { useState } from 'react'
import { setToken } from '../../lib/api'

interface Props {
  onSuccess: () => void
}

export default function TokenGate({ onSuccess }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('请输入 Admin Token')
      return
    }
    setToken(trimmed)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-[20px] p-8 w-full max-w-sm"
        style={{ boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px' }}
      >
        <h2 className="text-[22px] font-semibold text-[#222] mb-1 tracking-[-0.44px]">管理员登录</h2>
        <p className="text-sm text-[#6a6a6a] mb-6">请输入 Admin Token 以继续</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Admin Token"
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            className="w-full border border-[#c1c1c1] rounded-lg px-4 py-3 text-sm text-[#222] outline-none focus:border-[#222] focus:ring-2 focus:ring-[#222]/10 transition"
            autoFocus
          />
          {error && <p className="text-xs text-[#c13515]">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[#222] text-white rounded-lg py-3 text-base font-medium hover:bg-[#E8334A] active:scale-[0.98] transition-all"
          >
            进入后台
          </button>
        </form>
      </div>
    </div>
  )
}
