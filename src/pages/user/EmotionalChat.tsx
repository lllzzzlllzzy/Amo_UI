import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatBubble from '../../components/user/ChatBubble'
import { fetchBalance, clearCardCode, registerUserUnauthorizedHandler, streamEmotionalChat, type ChatHistoryItem } from '../../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SS_KEY = 'amo_emotional'

function loadSession(): { messages: Message[]; history: ChatHistoryItem[] } {
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { messages: [], history: [] }
}

function saveSession(messages: Message[], history: ChatHistoryItem[]) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ messages, history }))
  } catch { /* ignore */ }
}

export default function EmotionalChat() {
  const navigate = useNavigate()
  const session = loadSession()
  const [credits, setCredits] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>(session.messages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const historyRef = useRef<ChatHistoryItem[]>(session.history)
  const scrollRef = useRef<HTMLDivElement>(null)
  const assistantBuf = useRef('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    registerUserUnauthorizedHandler(() => navigate('/', { replace: true }))
    fetchBalance().then(setCredits).catch(() => {})
  }, [navigate])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setError('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages(prev => [...prev, { role: 'user', content: text }])

    assistantBuf.current = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    setStreaming(true)

    await streamEmotionalChat(text, historyRef.current, {
      onDelta(delta) {
        assistantBuf.current += delta
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: assistantBuf.current }
          return next
        })
        scrollToBottom()
      },
      onDone() {
        setStreaming(false)
        historyRef.current.push(
          { role: 'user', content: text },
          { role: 'assistant', content: assistantBuf.current },
        )
        setMessages(prev => {
          saveSession(prev, historyRef.current)
          return prev
        })
      },
      onError(msg) {
        setStreaming(false)
        setError(msg)
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SS_KEY)
    clearCardCode()
    navigate('/', { replace: true })
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f7f7f7]">
      {/* Header */}
      <header className="bg-white border-b border-[#f2f2f2] shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="返回"
              className="w-9 h-9 rounded-full bg-[#f2f2f2] flex items-center justify-center hover:bg-[#e5e5e5] active:scale-95 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-[#E8334A] text-lg font-bold tracking-[-0.44px]">情绪疏导</span>
          </div>
          <div className="flex items-center gap-3">
            {credits !== null && (
              <span className="text-xs text-[#6a6a6a]">
                余额 <span className="font-medium text-[#222]">{credits}</span>
              </span>
            )}
            <button onClick={handleLogout} className="text-sm text-[#6a6a6a] hover:text-[#222] transition">退出</button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth-y">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#fff0f3] flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8334A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <p className="text-[#222] font-medium">有什么想聊的吗？</p>
              <p className="text-sm text-[#6a6a6a] mt-1">我会像朋友一样倾听你的感受</p>
              <p className="text-xs text-[#6a6a6a] mt-3">每轮对话消耗 2 credits</p>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              role={m.role}
              content={m.content}
              streaming={streaming && i === messages.length - 1 && m.role === 'assistant'}
            />
          ))}
          {error && <p className="text-xs text-[#c13515] text-center mt-2">{error}</p>}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 bg-white border-t border-[#f2f2f2]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); autoGrow() }}
            onKeyDown={handleKeyDown}
            placeholder="说说你的感受..."
            rows={1}
            className="flex-1 resize-none text-sm text-[#222] outline-none bg-[#f2f2f2] rounded-[16px] px-4 py-2.5 max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            aria-label="发送"
            className="shrink-0 w-10 h-10 rounded-full bg-[#222] flex items-center justify-center hover:bg-[#E8334A] active:scale-95 transition-all disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
