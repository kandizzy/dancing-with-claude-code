'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { UserMessage } from '@/components/chat/UserMessage'
import { ask, isOverloadedError } from '@/lib/ai/client'
import { findUserEntryMatch } from '@/lib/figures/registry'
import type { FigureDefinition } from '@/lib/figures/types'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { ArrowUp, Check, FilePlus, HelpCircle, Loader2, Trash2 } from 'lucide-react'
import { PromoteButton } from './PromoteButton'
import { OverloadNotice } from './OverloadNotice'
import { Button } from '@/components/ui'

type FigureChatProps = {
  figure: FigureDefinition
  onMatchedText?: (text: string | null) => void
  className?: string
}

type RenderedMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  matchedText?: string | null
}

/**
 * Defensive validator for messages rehydrating from localStorage. Drops anything
 * that doesn't look like a normal rendered message, including:
 *   - Missing or non-string id/role/content
 *   - Roles other than user/assistant
 *   - Empty content
 *   - Content that's literally the SDK result envelope serialized as a string
 *     (`{"text": "...", "sessionId": "..."}`), which has appeared in the wild
 *     when an SDK error path packaged its own envelope into the text field.
 *     This shape is impossible to produce from a healthy reply, so dropping it
 *     on load is safe.
 *
 * Without this, a single bad message that lands in storage persists across
 * reloads forever, leaving the chat looking permanently broken — confusing
 * for reviewers and especially for students who lack the devtools knowledge
 * to clear localStorage manually.
 */
function isValidMessage(m: unknown): m is RenderedMessage {
  if (typeof m !== 'object' || m === null) return false
  const obj = m as Record<string, unknown>
  if (typeof obj.id !== 'string' || !obj.id) return false
  if (obj.role !== 'user' && obj.role !== 'assistant') return false
  if (typeof obj.content !== 'string' || !obj.content.trim()) return false
  // Reject SDK-envelope-shaped content.
  const trimmed = obj.content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'text' in parsed &&
        'sessionId' in parsed
      ) {
        return false
      }
    } catch {
      // Not JSON — it's fine.
    }
  }
  return true
}

const SYSTEM_PROMPT = `You are Claude, helping a user explore a small webcam project they have cloned locally. It's a browser-based face-detection app built on MediaPipe Tasks. The user's project has a CLAUDE.md file you should treat as authoritative project context — the Agent SDK reads it from disk for you. The "## Notes" section of CLAUDE.md is where the user records their own preferences and discoveries.

When a note in CLAUDE.md is relevant to the user's question — even loosely — quote or closely paraphrase it. Don't substitute generic advice. The user wrote it because they want to see it reflected back. Reuse the user's specific wording (e.g. "EMA", "hysteresis", concrete thresholds and constants) verbatim in your reply.

Keep replies short (1–3 short paragraphs). Treat prior turns of this conversation as context — follow-ups can build on what you said before.`

// Concrete example notes the user can one-click add to ## Notes. Mix of plain-English
// preferences anyone can pick (the first two) and one slightly more technical one for
// users who want to see what a domain-specific note looks like. The deliberate range
// makes the page approachable for a non-CV reader without making it feel like the
// project is gatekeeping.
const STARTER_NOTES: Array<{ label: string; text: string }> = [
  {
    label: 'Explain things simply',
    text: "I'm new to this. When you explain something, use plain words first and the technical name second.",
  },
  {
    label: 'Show me before you change things',
    text: 'Before suggesting a code change, describe what the change will look like in plain language. I want to understand before you propose anything.',
  },
  {
    label: 'Be specific about numbers',
    text: 'If you recommend a number — a threshold, a delay, anything — say what would happen at a higher number and what would happen at a lower one. I want to learn the trade-off, not just take the value.',
  },
]

export function FigureChat({ figure, onMatchedText, className }: FigureChatProps) {
  const { awardShape, isCompleted, claudeMd, appendNote, setClaudeMdOpen } = useLearnStore()
  const [messages, setMessages] = useState<RenderedMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  // When a 529 fires, capture the text that triggered it so the Retry button
  // can re-run the same send. Cleared on success or when the user types a new
  // question. Held separately from `messages` so the chat history stays clean
  // — the user sees their question above and the overload notice below it,
  // not an Error: … assistant turn that they'd have to manually delete.
  const [overloadFor, setOverloadFor] = useState<string | null>(null)
  // The Agent SDK session ID for this conversation, scoped per figure so each
  // workspace has its own conversation surface. Rehydrated from localStorage on mount.
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionStorageKey = `education-labs:figure-${figure.id}:session-id`
  const messagesStorageKey = `education-labs:figure-${figure.id}:messages`
  const completed = isCompleted(figure.id)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lastUserIdRef = useRef<string | null>(null)
  const lastAssistantIdRef = useRef<string | null>(null)

  // Rehydrate the session ID AND the rendered messages on mount so refreshing the
  // page keeps both the conversation alive on the SDK side AND the visible history
  // matching what Claude has in context. Without persisting messages, the user returns
  // to a blank chat while Claude still remembers everything — causing replies that
  // reference "earlier" turns the user can't see. Storage keys are figure-scoped
  // because FigureChat is reused across multiple figure pages.
  //
  // Every rehydrated message is validated via isValidMessage(); malformed entries
  // are silently dropped. This catches the case where a transient API failure left
  // a corrupted message in storage — without it, that bad message would persist
  // across reloads and leave the chat looking broken to anyone who hits it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedSession = window.localStorage.getItem(sessionStorageKey)
    if (storedSession) setSessionId(storedSession)
    const storedMessages = window.localStorage.getItem(messagesStorageKey)
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages) as unknown
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidMessage)
          setMessages(valid)
        }
      } catch {
        // Corrupted JSON — ignore and let the chat start fresh.
      }
    }
  }, [sessionStorageKey, messagesStorageKey])

  // Persist messages whenever they change. Removes the key when empty so a reset
  // (which clears messages back to []) cleans up its own storage too.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (messages.length === 0) {
      window.localStorage.removeItem(messagesStorageKey)
      return
    }
    window.localStorage.setItem(messagesStorageKey, JSON.stringify(messages))
  }, [messages, messagesStorageKey])

  // When a new user message lands, pin it to the top of the scroll viewport so the user can
  // see their question at the top while Claude works below. When a new assistant reply
  // lands, snap the top of that reply into view so reading starts from the first line.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

    if (lastAssistant && lastAssistant.id !== lastAssistantIdRef.current) {
      lastAssistantIdRef.current = lastAssistant.id
      const el = messageRefs.current[lastAssistant.id]
      if (el) {
        container.scrollTo({ top: el.offsetTop - container.offsetTop - 8, behavior: 'smooth' })
      }
      return
    }
    if (lastUser && lastUser.id !== lastUserIdRef.current) {
      lastUserIdRef.current = lastUser.id
      const el = messageRefs.current[lastUser.id]
      if (el) {
        container.scrollTo({ top: el.offsetTop - container.offsetTop - 8, behavior: 'smooth' })
      }
    }
  }, [messages, streaming])

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // Two send paths land here: a fresh user message from the textarea, and a
      // Retry on a 529. For the fresh path we append a new user message; for the
      // retry path the user message is already on screen (the previous attempt),
      // so we just re-run without duplicating it. We distinguish by checking
      // whether trimmed equals the pending overloadFor text.
      const isRetry = overloadFor != null && overloadFor === trimmed
      if (!isRetry) {
        const userMsg: RenderedMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
        setMessages((m) => [...m, userMsg])
        setInput('')
      }
      setOverloadFor(null)
      setStreaming(true)

      try {
        const result = await ask({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: trimmed,
          sessionId,
        })
        const matched = findUserEntryMatch(result.text, claudeMd)
        const assistantMsg: RenderedMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.text,
          matchedText: matched,
        }
        setMessages((m) => [...m, assistantMsg])
        // Capture the session ID the SDK assigned and persist it.
        if (result.sessionId) {
          setSessionId(result.sessionId)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(sessionStorageKey, result.sessionId)
          }
        }
        onMatchedText?.(matched)
        if (matched && !completed) {
          awardShape(figure.id, figure.shape, matched)
        }
      } catch (err) {
        // 529 overloads get a calm dedicated UI with a Retry button instead of
        // an inline "Error: …" message in the chat. Everything else falls
        // through to the generic error-as-assistant-message path.
        if (isOverloadedError(err)) {
          setOverloadFor(trimmed)
        } else {
          const errMsg =
            (err as Error)?.message ?? 'Request failed. Check your terminal for details.'
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${errMsg}` },
          ])
        }
      } finally {
        setStreaming(false)
      }
    },
    [figure, awardShape, completed, claudeMd, sessionId, sessionStorageKey, onMatchedText, overloadFor],
  )

  const onPickStarter = (text: string) => {
    appendNote(text)
    setClaudeMdOpen(true)
  }

  /**
   * Clear this chat's visible history AND the SDK-side session. "Clear" here
   * means: forget this conversation, start fresh — but keep all earned shapes,
   * the CLAUDE.md, and progress through the figures (those live in the learn
   * store, not the chat). Lighter than Reset Progress, which wipes everything.
   *
   * The student-facing case for this: a transient API error left a confusing
   * message in the chat, and they need a one-click way to recover without
   * losing what they've earned.
   */
  const clearConversation = useCallback(() => {
    setMessages([])
    setSessionId(null)
    setOverloadFor(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(sessionStorageKey)
      window.localStorage.removeItem(messagesStorageKey)
    }
  }, [sessionStorageKey, messagesStorageKey])

  const lastAssistant = messages.filter((m) => m.role === 'assistant').slice(-1)[0]
  const showSuccess = completed && lastAssistant?.matchedText
  const isEmpty = messages.length === 0
  const showFollowUpNudge =
    !streaming && lastAssistant && !lastAssistant.matchedText && !completed

  return (
    <div className={cn('flex h-full flex-col gap-4', className)}>
      <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto pr-2">
        {isEmpty && (
          <>
            <ClaudeMessage>
              <ClaudeParagraph className="text-text-primary m-0 font-semibold">
                What is CLAUDE.md?
              </ClaudeParagraph>
              <ClaudeParagraph className="text-text-secondary m-0 mt-1">
                It&apos;s your project&apos;s standing instructions. Claude reads this file
                before every reply, so anything you pin here becomes context Claude carries
                from now on — not just for this conversation, but every time someone runs
                Claude Code in this project. Most users never open it.
              </ClaudeParagraph>

              <ClaudeParagraph className="text-text-primary m-0 mt-4 font-semibold">
                How to try it.
              </ClaudeParagraph>
              <ClaudeParagraph className="text-text-secondary m-0 mt-1">
                Ask Claude anything about this project. When the reply says something
                worth keeping, hit <strong className="text-text-primary">Add to CLAUDE.md</strong>{' '}
                below the answer. Then ask a related follow-up — the reply that draws on your
                pinned note earns the circle.
              </ClaudeParagraph>

              <ClaudeParagraph className="text-text-tertiary text-xs m-0 mt-4">
                Curious how it works under the hood? CLAUDE.md is just a markdown file at the
                project root. The <code className="font-mono">## Notes</code> section is where
                your pinned notes land. The whole file gets prepended to Claude&apos;s context
                on every reply — that&apos;s the entire trick.
              </ClaudeParagraph>
            </ClaudeMessage>

            <div className="border-border-subtle bg-page mt-3 rounded-lg border p-3">
              <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
                Don&apos;t have a preference yet? Borrow one of these.
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
                      <div className="text-text-tertiary text-xs leading-snug">{n.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div
              key={m.id}
              ref={(el) => {
                messageRefs.current[m.id] = el
              }}
            >
              <UserMessage text={m.content} />
            </div>
          ) : (
            <div
              key={m.id}
              ref={(el) => {
                messageRefs.current[m.id] = el
              }}
            >
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

        {/* 529 overload affordance — only shown when a send hit a 529 AND a
           retry isn't currently in flight. The Retry button re-runs the same
           handleSend with the captured text. */}
        {overloadFor && !streaming && (
          <div className="mt-3">
            <OverloadNotice onRetry={() => handleSend(overloadFor)} />
          </div>
        )}
      </div>

      {showSuccess && (
        <div className="rounded-md border border-[color:var(--color-accent-strong)] bg-[color:var(--color-accent)]/5 p-4 text-sm">
          <div className="text-text-primary mb-1 flex items-center gap-2 font-semibold">
            <Check className="size-4" />
            Circle earned
          </div>
          <p className="text-text-secondary m-0">
            Claude just reused something <em>you</em> wrote. That&apos;s the whole trick — your
            CLAUDE.md is now project context Claude reads before every reply, not just chatter
            from earlier in this conversation.
          </p>
        </div>
      )}

      {showFollowUpNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-secondary m-0">
            Claude didn&apos;t pull from your notes this time. Either the question didn&apos;t
            touch any of them, or the notes are too general to land. Try adding a more specific
            one — or rewrite an existing note tighter — and ask again.
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
          placeholder="Ask Claude anything about this project…"
          disabled={streaming}
          className="text-text-primary font-text placeholder:text-text-tertiary w-full resize-none border-none bg-transparent p-0 text-sm leading-snug outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Clear-conversation button — only shown when there's actually a
             conversation to clear. Sits opposite the Send button so it reads
             as a paired action: this side starts over, that side advances. */}
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={clearConversation}
              disabled={streaming}
              className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1 text-xs disabled:opacity-50"
              aria-label="Clear conversation"
            >
              <Trash2 className="size-3" />
              Clear conversation
            </button>
          ) : (
            <span />
          )}
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

      {/* Quiet escape hatch for users who don't know what to try. Sends them to figure 2
          with the input prefilled — slash commands live there, and /explain-figure 1
          is the project's own explanation of this figure. The figure 1 page is the only
          stuck-prone surface we've identified; if testers hit the same wall on other
          figures, the same pattern can be lifted in. */}
      <Link
        href={`/learn/2?prefill=${encodeURIComponent('/explain-figure 1')}`}
        className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1.5 self-start text-xs"
      >
        <HelpCircle className="size-3" />
        Not sure what to try? Ask the slash command in figure 2.
      </Link>
    </div>
  )
}
