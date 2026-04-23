interface Props {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export default function ChatBubble({ role, content, streaming }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-[#222] text-white rounded-[16px] rounded-br-[4px]'
            : 'bg-[#f2f2f2] text-[#222] rounded-[16px] rounded-bl-[4px]'
        }`}
      >
        {content}
        {streaming && (
          <span className="inline-block w-1.5 h-4 bg-[#E8334A] rounded-sm ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}
