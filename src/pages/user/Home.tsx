import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserLayout from '../../components/user/UserLayout'
import { fetchBalance } from '../../lib/api'

const SHADOW = 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px'

const FEATURES = [
  {
    title: '聊天记录分析',
    desc: '深度分析情绪轨迹、沟通模式和潜在风险',
    credits: 20,
    unit: '次',
    path: '/analysis',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff385c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: '情绪疏导',
    desc: '像朋友一样倾听你，帮你理清情绪',
    credits: 2,
    unit: '轮',
    path: '/emotional',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff385c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    title: '冲突分析',
    desc: '分析争吵双方诉求，给出沟通建议',
    credits: 8,
    unit: '次',
    path: '/conflict',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff385c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

const PRICING = [
  { price: '9.9', credits: 30 },
  { price: '29.9', credits: 150 },
  { price: '59.9', credits: 400 },
]

export default function Home() {
  const navigate = useNavigate()
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    fetchBalance().then(setCredits).catch(() => {})
  }, [])

  return (
    <UserLayout>
      <div className="flex flex-col gap-6">

        {/* Hero */}
        <div className="rounded-[20px] p-6 pb-5 bg-gradient-to-br from-[#ff385c] to-[#e00b41] text-white" style={{ boxShadow: SHADOW }}>
          <h1 className="text-[28px] font-bold tracking-[-0.44px]">嗨，欢迎回来</h1>
          <p className="text-white/80 text-sm mt-1 mb-5">阿默帮你看清关系中的情绪与沟通</p>

          {/* Balance card inset */}
          <div className="bg-white/15 backdrop-blur-sm rounded-[14px] px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-white/70 text-xs font-medium">当前余额</p>
              <p className="text-[28px] sm:text-[32px] font-bold leading-tight tracking-[-0.44px]">
                {credits !== null ? credits : '—'}
                <span className="text-sm font-medium text-white/70 ml-1.5">credits</span>
              </p>
            </div>
            {credits !== null && (
              <div className="sm:text-right text-xs text-white/70 leading-relaxed flex sm:flex-col gap-3 sm:gap-0">
                <p>可用分析 ~{Math.floor(credits / 20)} 次</p>
                <p>可用疏导 ~{Math.floor(credits / 2)} 轮</p>
              </div>
            )}
          </div>
        </div>

        {/* Feature grid */}
        <div>
          <h2 className="text-[20px] font-semibold text-[#222] tracking-[-0.18px] mb-3">选择功能</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FEATURES.map(f => (
              <button
                key={f.path}
                onClick={() => navigate(f.path)}
                className="bg-white rounded-[20px] p-5 text-left flex flex-col items-start hover:translate-y-[-2px] transition-all"
                style={{ boxShadow: SHADOW }}
              >
                <div className="w-12 h-12 rounded-full bg-[#fff0f3] flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="text-[16px] font-semibold text-[#222]">{f.title}</h3>
                <p className="text-xs text-[#6a6a6a] mt-1 flex-1">{f.desc}</p>
                <span className="text-xs text-[#ff385c] font-medium mt-3">{f.credits} credits/{f.unit}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pricing reference */}
        <div className="bg-white rounded-[20px] p-5" style={{ boxShadow: SHADOW }}>
          <h2 className="text-[16px] font-semibold text-[#222] mb-3">额度参考</h2>
          <div className="grid grid-cols-3 gap-3">
            {PRICING.map(p => (
              <div key={p.price} className="bg-[#f2f2f2] rounded-[14px] p-3 text-center">
                <p className="text-[20px] font-bold text-[#222]">{p.credits}</p>
                <p className="text-xs text-[#6a6a6a]">credits</p>
                <p className="text-xs font-medium text-[#ff385c] mt-1.5">&yen;{p.price}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-[20px] p-5" style={{ boxShadow: SHADOW }}>
          <h2 className="text-[16px] font-semibold text-[#222] mb-3">使用小贴士</h2>
          <div className="flex flex-col gap-2.5">
            {[
              { emoji: '💬', text: '聊天记录分析支持追问，每次追问消耗 3 credits' },
              { emoji: '🫂', text: '情绪疏导支持多轮对话，AI 会记住上下文' },
              { emoji: '⚡', text: '冲突分析支持追问，每次追问消耗 5 credits' },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-sm shrink-0">{tip.emoji}</span>
                <p className="text-sm text-[#6a6a6a]">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </UserLayout>
  )
}
