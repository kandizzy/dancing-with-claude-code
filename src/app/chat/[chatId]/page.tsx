'use client'

import { use, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AssistantBody,
  ChatHeader,
  ClaudeMessage,
  InputBar,
  SparkIndicator,
  UserMessage,
} from '@/components/chat'
import { useChatStore } from '@/lib/chat-store'

export default function ChatView({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params)
  const router = useRouter()
  const {
    chats,
    models,
    model,
    setModel,
    thinking,
    streamBuffer,
    streamingChatId,
    sendReply,
    stopStream,
  } = useChatStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const chat = chats.find((c) => c.id === chatId)
  const isStreaming = streamingChatId === chatId
  const showInFlight = isStreaming && (thinking || streamBuffer)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamBuffer, thinking, chatId, chat?.messages.length])

  useEffect(() => {
    if (!chat) router.replace('/new')
  }, [chat, router])

  if (!chat) return null

  return (
    <>
      <ChatHeader title={chat.title} />

      <div ref={scrollRef} className="scroll-area flex-1 overflow-auto pt-6">
        <div className="mx-auto max-w-[var(--content-max-width)] px-6 pb-6">
          {chat.messages.map((m, i) =>
            m.role === 'user' ? (
              <UserMessage key={i} text={m.text} />
            ) : (
              <ClaudeMessage key={i}>
                <AssistantBody text={m.text} />
              </ClaudeMessage>
            ),
          )}

          {showInFlight && (
            <ClaudeMessage>
              {streamBuffer && <AssistantBody text={streamBuffer} />}
              <SparkIndicator working={thinking} />
            </ClaudeMessage>
          )}
        </div>
      </div>

      <div className="bg-page sticky bottom-0 flex justify-center px-6 pb-2 pt-4">
        <div className="w-full max-w-[var(--input-max-width-lg)]">
          <InputBar
            placeholder="Reply to Claude…"
            models={models}
            model={model}
            onModelChange={setModel}
            isStreaming={isStreaming}
            onSend={(text) => sendReply(chatId, text)}
            onStop={stopStream}
          />
        </div>
      </div>

      <div className="text-text-tertiary px-6 pb-3 text-center text-xs">
        Claude can make mistakes. Please double-check responses.
      </div>
    </>
  )
}
