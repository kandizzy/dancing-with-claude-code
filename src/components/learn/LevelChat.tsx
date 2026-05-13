'use client'

import { useCallback, useRef, useState } from 'react'
import { InputBar } from '@/components/chat/InputBar'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { UserMessage } from '@/components/chat/UserMessage'
import { MODELS, type Model } from '@/lib/api'
import { ask } from '@/lib/ai/client'
import { findUserEntryMatch } from '@/lib/levels/registry'
import type { LevelDefinition } from '@/lib/levels/types'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { PromoteButton } from './PromoteButton'

const HAIKU = MODELS.find((m) => m.id === 'claude-haiku-4-5') ?? MODELS[0]

type LevelChatProps = {
  level: LevelDefinition
  onMatchedText?: (text: string | null) => void
  className?: string
  suggestedPrompts?: string[]
  emptyHint?: string
}

type RenderedMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  matchedText?: string | null
}

const SYSTEM_PROMPT = `You are Claude, helping a user explore a browser-based computer vision playground. The user's project has a CLAUDE.md file you should treat as authoritative project context (in CLI mode you read it from disk natively; in API mode it's embedded in your system prompt). When the user's pinned notes are relevant, draw on them directly. Keep replies short (1–3 short paragraphs).`

export function LevelChat({
  level,
  onMatchedText,
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
      setMessages((m) => [...m, userMsg])
      setStreaming(true)
      setStreamBuffer('')

      try {
        const result = await ask({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: text,
          model: model.id,
        })
        const matched = findUserEntryMatch(result.text, claudeMd)
        const assistantMsg: RenderedMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.text,
          matchedText: matched,
        }
        setMessages((m) => [...m, assistantMsg])
        onMatchedText?.(matched)
        if (matched && !completed) {
          awardShape(level.id, level.shape, matched)
        }
      } catch (err) {
        const errMsg =
          (err as Error)?.message ?? 'Request failed. Check your terminal for details.'
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${errMsg}` },
        ])
      } finally {
        setStreaming(false)
        setStreamBuffer('')
      }
    },
    [level, awardShape, completed, claudeMd, model, onMatchedText],
  )

  const handleStop = useCallback(() => {
    // ask() is single-call buffered — there's no in-flight stream to abort. Keep the UI
    // contract (Stop button visible while streaming) but no-op the handler.
    abortRef.current?.abort()
  }, [])

  const lastAssistant = messages.filter((m) => m.role === 'assistant').slice(-1)[0]
  const showSuccess = completed && lastAssistant?.matchedText
  const isEmpty = messages.length === 0
  const showFollowUpNudge =
    !streaming &&
    lastAssistant &&
    !lastAssistant.matchedText &&
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
                <ClaudeMarkdown text={m.content} highlight={m.matchedText ?? null} />
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

      {showFollowUpNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-secondary m-0">
            Claude didn't draw on your notes this time. Try adding a note to the{' '}
            <code className="font-mono text-xs">## Notes</code> section of CLAUDE.md — or
            rewrite one to be more specific — and ask again.
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

