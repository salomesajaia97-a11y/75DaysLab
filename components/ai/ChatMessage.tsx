'use client'

interface ChatMessageProps {
  role: 'user' | 'ai'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: 'var(--foreground)',
                color: 'var(--background)',
                borderBottomRightRadius: '4px',
              }
            : {
                background: 'var(--muted)',
                color: 'var(--foreground)',
                borderBottomLeftRadius: '4px',
              }
        }
      >
        {content}
      </div>
    </div>
  )
}
