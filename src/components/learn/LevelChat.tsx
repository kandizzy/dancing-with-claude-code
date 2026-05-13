'use client'

import { useCallback, useRef, useState } from 'react'
import { InputBar } from '@/components/chat/InputBar'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { UserMessage } from '@/components/chat/UserMessage'
import { MODELS, type Model } from '@/lib/api'
import { streamLevelChat, type LevelMessage } from '@/lib/level-api'
import { findUserEntryMatch } from '@/lib/levels/registry'
import type { LevelDefinition, UserEntry } from '@/lib/levels/types'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { PromoteButton } from './PromoteButton'

const HAIKU = MODELS.find((m) => m.id === 'claude-haiku-4-5') ?? MODELS[0]

type LevelChatProps = {
  level: LevelDefinition
  onMatchedEntry?: (entry: UserEntry | null) => void
  className?: string
  // Optional one-click prompts shown above the input when the chat is empty.
  // Disappear after the first send.
  suggestedPrompts?: string[]
  // Override the empty-state framing line.
  emptyHint?: string
}

type RenderedMessage = LevelMessage & {
  id: string
  matchedEntry?: UserEntry | null
}

export function LevelChat({
  level,
  onMatchedEntry,
  className,
  suggestedPrompts,
  emptyHint,
}: LevelChatProps) {
  const { awardShape, isCompleted, claudeMd } = useLearnStore()
  const [messages, setMessages] = useState<RenderedMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [model, setModel] = useState<Model>(HAIKU)
  const abortRef = useRef<AbortController | null>(null)
  const completed = isCompleted(level.id)

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: RenderedMessage = { id: crypto.randomUUID(), role: 'user', content: text }
      const nextHistory: LevelMessage[] = [...messages, userMsg].map(({ role, content }) => ({
        role,
        content,
      }))
      setMessages((m) => [...m, userMsg])
      setStreaming(true)
      setStreamBuffer('')

      const controller = new AbortController()
      abortRef.current = controller

      let buffer = ''
      try {
        const full = await streamLevelChat(
          level.id,
          nextHistory,
          claudeMd,
          (delta) => {
            buffer += delta
            setStreamBuffer(buffer)
          },
          { model: model.id, signal: controller.signal },
        )
        const matched = findUserEntryMatch(full, claudeMd.userEntries)
        const assistantMsg: RenderedMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: full,
          matchedEntry: matched,
        }
        setMessages((m) => [...m, assistantMsg])
        onMatchedEntry?.(matched)
        if (matched && !completed) {
          awardShape(level.id, level.shape, matched.text)
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error(err)
        }
      } finally {
        setStreaming(false)
        setStreamBuffer('')
        abortRef.current = null
      }
    },
    [messages, level, awardShape, completed, claudeMd, model, onMatchedEntry],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const lastAssistant = messages.filter((m) => m.role === 'assistant').slice(-1)[0]
  const showSuccess = completed && lastAssistant?.matchedEntry
  const hasNoEntries = claudeMd.userEntries.length === 0
  const isEmpty = messages.length === 0
  const showFirstAskNudge =
    !streaming && lastAssistant && !lastAssistant.matchedEntry && hasNoEntries && !completed
  const showFollowUpNudge =
    !streaming &&
    lastAssistant &&
    !lastAssistant.matchedEntry &&
    !hasNoEntries &&
    !completed
  const showChips =
    isEmpty && !streaming && suggestedPrompts && suggestedPrompts.length > 0

  return (
    <div className={cn('flex h-full flex-col gap-4', className)}>
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        {isEmpty && (
          <ClaudeMessage>
            <ClaudeParagraph className="text-text-secondary italic">
              {emptyHint ??
                'Ask about the playground. When Claude says something worth keeping, add it to CLAUDE.md and ask again — the next reply will use it.'}
            </ClaudeParagraph>
          </ClaudeMessage>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <UserMessage key={m.id} text={m.content} />
          ) : (
            <div key={m.id}>
              <ClaudeMessage>
                <ClaudeParagraph className="whitespace-pre-wrap">
                  {highlightMatch(m.content, m.matchedEntry)}
                </ClaudeParagraph>
              </ClaudeMessage>
              <div className="-mt-1 mb-3 flex items-center gap-3 pl-4">
                <PromoteButton sourceText={m.content} />
              </div>
            </div>
          ),
        )}

        {streaming && streamBuffer && (
          <ClaudeMessage>
            <ClaudeParagraph className="whitespace-pre-wrap">{streamBuffer}</ClaudeParagraph>
          </ClaudeMessage>
        )}
      </div>

      {showSuccess && (
        <div className="rounded-md border border-[color:var(--color-accent-strong)] bg-[color:var(--color-accent)]/5 p-4 text-sm">
          <div className="text-text-primary mb-1 flex items-center gap-2 font-semibold">
            <Check className="size-4" />
            Circle earned
          </div>
          <p className="text-text-secondary m-0">
            Claude just used what <em>you</em> wrote into CLAUDE.md. Your writing is now part of
            the project context Claude reads on every ask. Keep adding as you go.
          </p>
        </div>
      )}

      {showFirstAskNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-secondary m-0">
            Notice the reply doesn't reflect anything specific to your project yet — your CLAUDE.md
            only has the seed content. Try adding something to it from this reply (or write your
            own note in the file), then ask a similar question again.
          </p>
        </div>
      )}

      {showFollowUpNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-secondary m-0">
            Claude didn't quote your notes this time. Try asking something that depends on one of
            them, or rewrite a note to be more specific.
          </p>
        </div>
      )}

      {showChips && (
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="text-text-secondary border-border-subtle hover:bg-state-hover hover:text-text-primary rounded-full border px-3 py-1 text-xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <InputBar
        models={MODELS}
        model={model}
        onModelChange={setModel}
        isStreaming={streaming}
        onSend={handleSend}
        onStop={handleStop}
        placeholder="Ask Claude about the playground…"
      />
    </div>
  )
}

// Wrap a matched entry's text in a highlight span where it appears in the reply.
// Falls back to the longest 4-word slice if the full entry isn't substring-present.
function highlightMatch(text: string, matched: UserEntry | null | undefined) {
  if (!matched) return text
  const normEntry = matched.text.toLowerCase()
  const normText = text.toLowerCase()
  let idx = normText.indexOf(normEntry)
  let len = matched.text.length
  if (idx < 0) {
    // Try 4-word slices.
    const words = matched.text.split(/\s+/)
    for (let i = 0; i + 4 <= words.length; i++) {
      const slice = words.slice(i, i + 4).join(' ').toLowerCase()
      const at = normText.indexOf(slice)
      if (at >= 0) {
        idx = at
        len = slice.length
        break
      }
    }
  }
  if (idx < 0) return text

  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + len)
  const after = text.slice(idx + len)
  return (
    <>
      {before}
      <mark className="rounded-xs bg-[color:var(--color-accent)]/25 px-0.5">{match}</mark>
      {after}
    </>
  )
}
