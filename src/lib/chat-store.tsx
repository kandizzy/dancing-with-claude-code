'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Chat, Config, Message } from './types'
import { DEFAULT_CONFIG, SEED_CHATS } from './seed'
import { DEFAULT_MODEL, MODELS, streamChat, type Model } from './api'

type ChatStore = {
  config: Config
  models: Model[]
  model: Model
  setModel: (model: Model) => void
  chats: Chat[]
  thinking: boolean
  streamBuffer: string
  streamingChatId: string | null
  createChat: (text: string) => string
  sendReply: (chatId: string, text: string) => void
  deleteChat: (chatId: string) => void
  stopStream: () => void
}

const ChatContext = createContext<ChatStore | null>(null)

const STORAGE_KEY = 'education-labs:chats'

function makeTitle(text: string) {
  const first = text.trim().split('\n')[0]
  return first.length > 40 ? first.slice(0, 40) + '…' : first
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [config] = useState<Config>(DEFAULT_CONFIG)
  const [model, setModel] = useState<Model>(DEFAULT_MODEL)
  const [chats, setChats] = useState<Chat[]>(SEED_CHATS)
  const [hydrated, setHydrated] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      try {
        const parsed: Chat[] = JSON.parse(stored)
        if (parsed.length > 0) setChats(parsed)
      } catch {
        /* corrupt payload — fall back to seeds */
      }
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  }, [chats, hydrated])

  const commitAssistant = useCallback((chatId: string, text: string) => {
    setChats((cs) =>
      cs.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, { role: 'assistant', text }] } : c,
      ),
    )
  }, [])

  const reset = useCallback(() => {
    setThinking(false)
    setStreamBuffer('')
    setStreamingChatId(null)
    abortRef.current = null
    bufferRef.current = ''
  }, [])

  const stopStream = useCallback(() => {
    const chatId = streamingChatId
    const partial = bufferRef.current
    abortRef.current?.abort()
    if (chatId && partial) commitAssistant(chatId, partial)
    reset()
  }, [streamingChatId, commitAssistant, reset])

  const runCompletion = useCallback(
    async (chatId: string, history: Message[]) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      bufferRef.current = ''

      setThinking(true)
      setStreamingChatId(chatId)
      setStreamBuffer('')

      try {
        const text = await streamChat(
          history,
          model,
          (delta) => {
            bufferRef.current += delta
            setStreamBuffer(bufferRef.current)
          },
          controller.signal,
        )
        commitAssistant(chatId, text)
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') console.error(err)
      } finally {
        if (abortRef.current === controller) reset()
      }
    },
    [model, commitAssistant, reset],
  )

  const createChat = useCallback(
    (text: string) => {
      const id = 'c' + Date.now()
      const userMsg: Message = { role: 'user', text }
      const chat: Chat = { id, title: makeTitle(text), messages: [userMsg] }
      setChats((cs) => [chat, ...cs])
      runCompletion(id, [userMsg])
      return id
    },
    [runCompletion],
  )

  const deleteChat = useCallback(
    (chatId: string) => {
      if (streamingChatId === chatId) abortRef.current?.abort()
      setChats((cs) => {
        const next = cs.filter((c) => c.id !== chatId)
        return next.length > 0 ? next : SEED_CHATS
      })
    },
    [streamingChatId],
  )

  const sendReply = useCallback(
    (chatId: string, text: string) => {
      const userMsg: Message = { role: 'user', text }
      let nextHistory: Message[] = []

      setChats((cs) =>
        cs.map((c) => {
          if (c.id !== chatId) return c
          nextHistory = [...c.messages, userMsg]
          return { ...c, messages: nextHistory }
        }),
      )

      runCompletion(chatId, nextHistory)
    },
    [runCompletion],
  )

  return (
    <ChatContext.Provider
      value={{
        config,
        models: MODELS,
        model,
        setModel,
        chats,
        thinking,
        streamBuffer,
        streamingChatId,
        createChat,
        sendReply,
        deleteChat,
        stopStream,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatStore() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatStore must be used within ChatProvider')
  return ctx
}
