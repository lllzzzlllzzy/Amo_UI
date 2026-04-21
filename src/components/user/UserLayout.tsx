import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchBalance, clearCardCode, registerUserUnauthorizedHandler } from '../../lib/api'

interface Props {
  children: React.ReactNode
}

export default function UserLayout({ children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [credits, setCredits] = useState<number | null>(null)
  const isHome = location.pathname === '/home'

  useEffect(() => {
    registerUserUnauthorizedHandler(() => navigate('/', { replace: true }))
  }, [navigate])

  useEffect(() => {
    fetchBalance().then(setCredits).catch(() => {})
  }, [])

  function handleLogout() {
    clearCardCode()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <header className="bg-white border-b border-[#f2f2f2] sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isHome && (
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-full bg-[#f2f2f2] flex items-center justify-center hover:bg-[#e5e5e5] active:scale-95 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <span className="text-[#ff385c] text-lg font-bold tracking-[-0.44px]">阿默</span>
          </div>
          <div className="flex items-center gap-3">
            {credits !== null && (
              <span className="text-sm text-[#6a6a6a] hidden sm:inline">
                余额 <span className="font-medium text-[#222]">{credits}</span> credits
              </span>
            )}
            <div className="w-px h-4 bg-[#e5e5e5] hidden sm:block" />
            <button onClick={handleLogout} className="text-sm text-[#6a6a6a] hover:text-[#222] active:opacity-70 transition">
              退出
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  )
}
