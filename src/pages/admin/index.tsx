import { useEffect, useState, useCallback } from 'react'
import {
  getToken, clearToken, fetchCards, registerUnauthorizedHandler,
  type Card, type GenerateResult,
} from '../../lib/api'
import TokenGate from '../../components/admin/TokenGate'
import GenerateForm from '../../components/admin/GenerateForm'
import GeneratedList from '../../components/admin/GeneratedList'
import CardTable from '../../components/admin/CardTable'

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!getToken())
  const [cards, setCards] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<GenerateResult | null>(null)

  const loadCards = useCallback(async () => {
    if (!getToken()) return
    setCardsLoading(true)
    try {
      const data = await fetchCards()
      setCards(data)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === '401') return
      console.error(err)
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
              <span className="text-[#ff385c] text-xl font-bold tracking-[-0.44px]">阿默</span>
              <span className="text-[#6a6a6a] text-sm">管理后台</span>
            </div>
            {authed && (
              <button
                onClick={handleLogout}
                className="text-sm text-[#6a6a6a] hover:text-[#222] transition"
              >
                退出登录
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
          {/* Top row: form + generated result */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GenerateForm
              onGenerated={result => setLastResult(result)}
              onRefreshList={loadCards}
            />
            <GeneratedList result={lastResult} />
          </div>

          {/* Card list */}
          <CardTable cards={cards} loading={cardsLoading} />
        </main>
      </div>
    </>
  )
}
