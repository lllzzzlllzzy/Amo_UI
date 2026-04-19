import { useState } from 'react'
import { copyToClipboard, formatTimestamp } from '../../lib/utils'
import type { GenerateResult } from '../../lib/api'

interface Props {
  result: GenerateResult | null
}

export default function GeneratedList({ result }: Props) {
  const [copied, setCopied] = useState(false)

  if (!result) return null

  async function handleCopyAll() {
    await copyToClipboard(result!.codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="bg-white rounded-[20px] p-6"
      style={{ boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px' }}
    >
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-[20px] font-semibold text-[#222] tracking-[-0.18px]">生成结果</h2>
          <p className="text-sm text-[#6a6a6a] mt-0.5">
            共 {result.count} 张 · {result.credits_per_card} credits/张 · 过期：{formatTimestamp(result.expires_at)}
          </p>
        </div>
        <button
          onClick={handleCopyAll}
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium border border-[#c1c1c1] text-[#222] hover:border-[#222] hover:bg-[#f2f2f2] transition"
        >
          {copied ? '已复制 ✓' : '一键复制全部'}
        </button>
      </div>

      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {result.codes.map(code => (
          <div
            key={code}
            className="flex items-center justify-between bg-[#f2f2f2] rounded-lg px-4 py-2.5 gap-3"
          >
            <span className="font-mono text-sm text-[#222] tracking-wide">{code}</span>
            <CopyButton text={code} />
          </div>
        ))}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs text-[#6a6a6a] hover:text-[#222] transition shrink-0"
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}
