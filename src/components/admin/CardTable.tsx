import { useState } from 'react'
import { formatTimestamp } from '../../lib/utils'
import type { Card } from '../../lib/api'

type SortKey = 'used_ratio' | 'created_at' | 'credits'

interface Props {
  cards: Card[]
  loading: boolean
}

export default function CardTable({ cards, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDesc, setSortDesc] = useState(true)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc(d => !d)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const sorted = [...cards].sort((a, b) => {
    let av = 0, bv = 0
    if (sortKey === 'used_ratio') {
      av = a.total > 0 ? a.used / a.total : 0
      bv = b.total > 0 ? b.used / b.total : 0
    } else if (sortKey === 'created_at') {
      av = a.created_at
      bv = b.created_at
    } else {
      av = a.credits
      bv = b.credits
    }
    return sortDesc ? bv - av : av - bv
  })

  function SortBtn({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`flex items-center gap-1 text-xs font-medium transition ${active ? 'text-[#222]' : 'text-[#6a6a6a] hover:text-[#222]'}`}
      >
        {label}
        <span className="text-[10px]">{active ? (sortDesc ? '↓' : '↑') : '↕'}</span>
      </button>
    )
  }

  return (
    <div
      className="bg-white rounded-[20px] p-6"
      style={{ boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px' }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-[20px] font-semibold text-[#222] tracking-[-0.18px]">
          卡密列表
          {!loading && <span className="text-sm font-normal text-[#6a6a6a] ml-2">共 {cards.length} 张</span>}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#6a6a6a]">排序：</span>
          <SortBtn label="使用比例" k="used_ratio" />
          <SortBtn label="剩余额度" k="credits" />
          <SortBtn label="创建时间" k="created_at" />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[#6a6a6a]">加载中...</div>
      ) : cards.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#6a6a6a]">暂无卡密</div>
      ) : (
        /* Desktop table */
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f2f2f2]">
                  {['卡密码', '剩余额度', '初始额度', '已使用', '使用进度', '创建时间', '过期时间'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-[#6a6a6a] pb-3 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(card => (
                  <tr key={card.code} className="border-b border-[#f2f2f2] last:border-0 hover:bg-[#f2f2f2]/40 transition">
                    <td className="py-3 pr-4 font-mono text-xs text-[#222] whitespace-nowrap">{card.code}</td>
                    <td className="py-3 pr-4 text-[#222] font-medium">{card.credits}</td>
                    <td className="py-3 pr-4 text-[#6a6a6a]">{card.total}</td>
                    <td className="py-3 pr-4 text-[#6a6a6a]">{card.used}</td>
                    <td className="py-3 pr-4 min-w-[100px]">
                      <UsageBar used={card.used} total={card.total} />
                    </td>
                    <td className="py-3 pr-4 text-[#6a6a6a] whitespace-nowrap">{formatTimestamp(card.created_at)}</td>
                    <td className="py-3 text-[#6a6a6a] whitespace-nowrap">{formatTimestamp(card.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {sorted.map(card => (
              <div key={card.code} className="bg-[#f2f2f2] rounded-[14px] p-4">
                <p className="font-mono text-xs text-[#222] mb-2 break-all">{card.code}</p>
                <UsageBar used={card.used} total={card.total} />
                <div className="flex justify-between mt-2 text-xs text-[#6a6a6a]">
                  <span>剩余 <strong className="text-[#222]">{card.credits}</strong> / {card.total}</span>
                  <span>创建 {formatTimestamp(card.created_at)}</span>
                </div>
                <p className="text-xs text-[#6a6a6a] mt-1">过期：{formatTimestamp(card.expires_at)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const color = pct >= 80 ? '#ff385c' : pct >= 50 ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-[#6a6a6a] w-8 text-right">{pct}%</span>
    </div>
  )
}
