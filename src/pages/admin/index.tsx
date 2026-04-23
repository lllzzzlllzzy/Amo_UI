import { useEffect, useState, useCallback } from 'react'
import {
  getToken, clearToken, fetchCards, registerUnauthorizedHandler,
  type Card, type GenerateResult,
} from '../../lib/api'
import TokenGate from '../../components/admin/TokenGate'
import GenerateForm from '../../components/admin/GenerateForm'
import GeneratedList from '../../components/admin/GeneratedList'
import CardTable from '../../components/admin/CardTable'
import StatsBar from '../../components/admin/StatsBar'

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!getToken())
  const [cards, setCards] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardsError, setCardsError] = useState('')
  const [lastResult, setLastResult] = useState<GenerateResult | null>(null)

  const loadCards = useCallback(async () => {
    if (!getToken()) return
    setCardsLoading(true)
    setCardsError('')
    try {
      const data = await fetchCards()
      setCards(data)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === '401') return
      setCardsError('加载卡密失败，请刷新重试')
    } finally {
      setCardsLoading(false)
    }
  }, [])

  useEffect(() => {
    registerUnauthorizedHandler(() => setAuthed(false))
  }, [])

  useEffect(() => {
    if (authed) loadCards()
  }, [authed, loadCards])

  function handleLogout() {
    clearToken()
    setAuthed(false)
    setCards([])
    setLastResult(null)
  }

  return (
    <>
      {!authed && <TokenGate onSuccess={() => setAuthed(true)} />}

      <div className="min-h-screen bg-[#f7f7f7]">
        {/* Header */}
        <header className="bg-white border-b border-[#f2f2f2] sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#E8334A] text-xl font-bold tracking-[-0.44px]">阿默</span>
              <span className="text-[#6a6a6a] text-sm">管理后台</span>
            </div>
            {authed && (
              <div className="flex items-center gap-3">
                <button
                  onClick={loadCards}
                  aria-label="刷新数据"
                  className="w-9 h-9 rounded-full bg-[#f2f2f2] flex items-center justify-center hover:bg-[#e5e5e5] active:scale-95 transition"
                  title="刷新数据"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
                <div className="w-px h-4 bg-[#e5e5e5]" />
                <button
                  onClick={handleLogout}
                  className="text-sm text-[#6a6a6a] hover:text-[#222] transition"
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
          {cardsError && (
            <p className="text-sm text-[#c13515] text-center bg-[#fff0f0] rounded-lg py-2">{cardsError}</p>
          )}

          {/* Stats overview */}
          <StatsBar cards={cards} loading={cardsLoading} />

          {/* Generate section */}
          <section>
            <h2 className="text-[22px] font-semibold text-[#222] tracking-[-0.44px] mb-4">生成卡密</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GenerateForm
                onGenerated={result => setLastResult(result)}
                onRefreshList={loadCards}
              />
              <GeneratedList result={lastResult} />
            </div>
          </section>

          {/* Card list */}
          <CardTable cards={cards} loading={cardsLoading} />
        </main>
      </div>
    </>
  )
}
