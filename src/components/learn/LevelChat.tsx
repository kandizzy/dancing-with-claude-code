'use client'

import { useCallback, useState } from 'react'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { UserMessage } from '@/components/chat/UserMessage'
import { ask } from '@/lib/ai/client'
import { findUserEntryMatch } from '@/lib/levels/registry'
import type { LevelDefinition } from '@/lib/levels/types'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { ArrowUp, Check, FilePlus, Loader2 } from 'lucide-react'
import { PromoteButton } from './PromoteButton'
import { Button } from '@/components/ui'

type LevelChatProps = {
  level: LevelDefinition
  onMatchedText?: (text: string | null) => void
  className?: string
}

type RenderedMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  matchedText?: string | null
}

const SYSTEM_PROMPT = `You are Claude, helping a user explore a browser-based computer vision playground. The user's project has a CLAUDE.md file you should treat as authoritative project context (in CLI mode you read it from disk natively; in API mode it's embedded above). The "## Notes" section of CLAUDE.md is where the user records their own preferences and discoveries.

When a note in CLAUDE.md is relevant to the user's question — even loosely — quote or closely paraphrase it. Don't substitute generic advice. The user wrote it because they want to see it reflected back. Reuse the user's specific wording (e.g. "EMA", "hysteresis", concrete thresholds and constants) verbatim in your reply.

Keep replies short (1–3 short paragraphs).`

// Concrete example notes the user can one-click add to ## Notes. Designed to be the
// kind of thing a real designer would write while working with the playground.
const STARTER_NOTES: Array<{ label: string; text: string }> = [
  {
    label: 'I prefer fewer false positives',
    text: "I'd rather miss faces than detect false ones. Prefer thresholds 0.8+.",
  },
  {
    label: 'I shoot in low light',
    text: "I usually work in dim light. Suggest a threshold around 0.5; flag when scores drop below 0.4 across multiple frames.",
  },
  {
    label: 'Always cite the score',
    text: "Always cite the most recent detection's actual score before recommending a change. Don't guess.",
  },
]

export function LevelChat({ level, onMatchedText, className }: LevelChatProps) {
  const { awardShape, isCompleted, claudeMd, appendNote, setClaudeMdOpen } = useLearnStore()
  const [messages, setMessages] = useState<RenderedMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const completed = isCompleted(level.id)

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const userMsg: RenderedMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
      setMessages((m) => [...m, userMsg])
      setInput('')
      setStreaming(true)

      try {
        const result = await ask({ systemPrompt: SYSTEM_PROMPT, userPrompt: trimmed })
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
      }
    },
    [level, awardShape, completed, claudeMd, onMatchedText],
  )

  const onPickStarter = (text: string) => {
    appendNote(text)
    setClaudeMdOpen(true)
  }

  const lastAssistant = messages.filter((m) => m.role === 'assistant').slice(-1)[0]
  const showSuccess = completed && lastAssistant?.matchedText
  const isEmpty = messages.length === 0
  const showFollowUpNudge =
    !streaming && lastAssistant && !lastAssistant.matchedText && !completed

  return (
    <div className={cn('flex h-full flex-col gap-4', className)}>
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        {isEmpty && (
          <>
            <ClaudeMessage>
              <ClaudeParagraph className="text-text-secondary italic">
                Ask about the playground. When Claude says something worth keeping, add it to{' '}
                <code className="font-mono text-xs">CLAUDE.md</code> and ask again — the next
                reply will use it.
              </ClaudeParagraph>
            </ClaudeMessage>

            <div className="border-border-subtle bg-page mt-3 rounded-lg border p-3">
              <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
                Stuck on what to add? Try a starter note.
              </div>
              <div className="flex flex-col gap-1.5">
                {STARTER_NOTES.map((n) => (
                  <button
                    key={n.label}
                    type="button"
                    onClick={() => onPickStarter(n.text)}
                    className="hover:bg-state-hover -mx-2 flex items-start gap-2 rounded-md px-2 py-1.5 text-left"
                  >
                    <FilePlus className="text-text-tertiary mt-0.5 size-3 shrink-0" />
                    <div className="flex-1">
                      <div className="text-text-primary text-sm font-medium">{n.label}</div>
                      <div className="text-text-tertiary truncate text-xs">{n.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
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

        {streaming && (
          <ClaudeMessage>
            <div className="text-text-tertiary inline-flex items-center gap-2 text-xs">
              <Loader2 className="size-3 animate-spin" />
              claude is working…
            </div>
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
            the project context Claude reads on every ask.
          </p>
        </div>
      )}

      {showFollowUpNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-secondary m-0">
            Claude didn't draw on your notes this time. Try adding a note that the question
            depends on — or rewrite one to be more specific.
          </p>
        </div>
      )}

      <div className="border-border-subtle bg-surface relative rounded-xl border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(input)
            }
          }}
          rows={2}
          placeholder="Ask Claude about the playground…"
          disabled={streaming}
          className="text-text-primary font-text placeholder:text-text-tertiary w-full resize-none border-none bg-transparent p-0 text-sm leading-snug outline-none"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="primary"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || streaming}
            aria-label="Send"
          >
            {streaming ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
