import type { Card } from '../../lib/api'

interface Props {
  cards: Card[]
  loading: boolean
}

export default function StatsBar({ cards, loading }: Props) {
  const totalCards = cards.length
  const activeCards = cards.filter(c => c.used > 0).length
  const totalCredits = cards.reduce((sum, c) => sum + c.total, 0)
  const usedCredits = cards.reduce((sum, c) => sum + c.used, 0)
  const usagePct = totalCredits > 0 ? Math.round((usedCredits / totalCredits) * 100) : 0

  const stats = [
    { label: '总卡密数', value: totalCards },
    { label: '已激活', value: activeCards },
    { label: '总额度', value: totalCredits },
    { label: '已消耗', value: usedCredits, bar: true },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[20px] p-5"
            style={{ boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px' }}
          >
            <div className="h-4 w-16 bg-[#f2f2f2] rounded animate-pulse mb-2" />
            <div className="h-8 w-20 bg-[#f2f2f2] rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <div
          key={s.label}
          className="bg-white rounded-[20px] p-5"
          style={{ boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px' }}
        >
          <p className="text-sm text-[#6a6a6a] font-medium">{s.label}</p>
          <p className="text-[28px] font-bold text-[#222] tracking-[-0.44px] mt-1">{s.value.toLocaleString()}</p>
          {s.bar && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${usagePct}%`,
                    backgroundColor: usagePct >= 80 ? '#ff385c' : usagePct >= 50 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              <span className="text-xs text-[#6a6a6a]">{usagePct}%</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
