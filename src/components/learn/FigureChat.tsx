'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { UserMessage } from '@/components/chat/UserMessage'
import { ask, isOverloadedError, isRateLimitError, judgeNoteReuse } from '@/lib/ai/client'
import { assembleSystemPrompt, getNoteEntries } from '@/lib/figures/registry'
import type { FigureDefinition } from '@/lib/figures/types'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { ArrowUp, FilePlus, HelpCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { PromoteButton } from './PromoteButton'
import { OverloadNotice } from './OverloadNotice'
import { ThinkingState } from './ThinkingState'
import { Shape } from './Shape'
import { Button } from '@/components/ui'

type FigureChatProps = {
  figure: FigureDefinition
  onMatchedText?: (text: string | null) => void
  className?: string
}

type RenderedMessage = {
  id: string
  // 'divider' is a non-conversational marker rendered inline in the transcript — e.g. the
  // "Context reloaded" beat. It is never sent to Claude.
  role: 'user' | 'assistant' | 'divider'
  content: string
  // The note (if any) this reply reused — drives the "Circle earned" banner and the award.
  matchedText?: string | null
  // The verbatim span of THIS reply to highlight (the applied text the judge pointed at).
  // Lets the highlight track paraphrased reuse, where the note text isn't present to find.
  highlightText?: string | null
}

/**
 * Defensive validator for messages rehydrating from localStorage. Drops anything
 * that doesn't look like a normal rendered message, including:
 *   - Missing or non-string id/role/content
 *   - Roles other than user/assistant/divider
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
  if (obj.role !== 'user' && obj.role !== 'assistant' && obj.role !== 'divider') return false
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

// Figure-1-specific guidance, appended to the assembled CLAUDE.md system prompt. The base
// (assembleSystemPrompt) inlines the *pinned* CLAUDE.md and tells Claude to prefer it; this
// adds the "## Notes are the user's own preferences — quote them verbatim" nuance that makes
// the gate land, plus the multi-turn note.
const FIGURE1_EXTRA = `The "## Notes" section of CLAUDE.md is where the user records their own preferences and discoveries. When a note there is even loosely relevant to the question, quote or closely paraphrase it and reuse the user's specific wording (e.g. "EMA", "hysteresis", concrete thresholds and constants) verbatim — don't substitute generic advice. The user wrote it because they want to see it reflected back. Treat prior turns of this conversation as context; follow-ups can build on what you said before.`

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
  const {
    awardShape,
    isCompleted,
    claudeMd,
    pinnedClaudeMd,
    graceUsed,
    reloadContext,
    appendNote,
    setClaudeMdOpen,
  } = useLearnStore()
  const [messages, setMessages] = useState<RenderedMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  // True when the most recent ask ran against the *stale* pinned CLAUDE.md — i.e. the user
  // had unpinned edits and the first-edit grace was already spent. Drives the "reload to
  // apply" nudge. This is the "let them feel it" moment: the reply visibly ignores the edit,
  // then we explain the /clear · /compact · restart gotcha.
  const [staleAskPending, setStaleAskPending] = useState(false)
  // Whether the in-progress ask is loading a freshly pinned note into context (the grace ask
  // or a post-reload re-ask) — drives the "note takes the stage" beat in the thinking shape.
  const [notesLoading, setNotesLoading] = useState(false)
  // Whether the post-reply note-reuse judge is running. The reply is already shown; the earn /
  // nudge verdict is still being decided, so we gate the result banners on this to avoid a flash.
  const [judging, setJudging] = useState(false)
  // When a 529 or 429 fires, capture both the text that triggered it and
  // which kind of error it was so the right notice + recovery affordance
  // can render. Cleared on success or when the user types a new question.
  // Held separately from `messages` so the chat history stays clean.
  const [pendingError, setPendingError] = useState<
    { kind: 'overloaded' | 'rate-limit'; text: string } | null
  >(null)
  // The Agent SDK session ID for this conversation, scoped per figure so each
  // workspace has its own conversation surface. Rehydrated from localStorage on mount.
  // Held in a ref (not state) because nothing renders from it, and async flows (grace reload
  // → ask, manual reload → re-ask) need to read the freshly-reset value synchronously rather
  // than from a stale render closure. Persistence lives in localStorage via setSession.
  const sessionIdRef = useRef<string | null>(null)
  const sessionStorageKey = `education-labs:figure-${figure.id}:session-id`
  const messagesStorageKey = `education-labs:figure-${figure.id}:messages`
  const completed = isCompleted(figure.id)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lastUserIdRef = useRef<string | null>(null)
  const lastAssistantIdRef = useRef<string | null>(null)

  // Single writer for the SDK session id: keeps the ref, the state, and localStorage in
  // lockstep. Passing null clears it (and removes the key), which is how a reload starts a
  // fresh context.
  const setSession = useCallback(
    (id: string | null) => {
      sessionIdRef.current = id
      if (typeof window === 'undefined') return
      if (id) window.localStorage.setItem(sessionStorageKey, id)
      else window.localStorage.removeItem(sessionStorageKey)
    },
    [sessionStorageKey],
  )

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
    if (storedSession) {
      sessionIdRef.current = storedSession
    }
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
  // Dividers are ignored — they're not conversational turns.
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

  // The core ask. Callers pass the exact CLAUDE.md snapshot Claude should see (`pinnedSnapshot`)
  // and the session to continue (or null for a fresh context), so this never re-reads
  // possibly-stale store/session values mid-flow. `markStale` tags the resulting reply as one
  // that ran without the user's latest edit (drives the reload nudge). Claude only ever
  // receives the inlined snapshot — no disk read — so the snapshot is exactly what it sees,
  // and the gate matches against that same snapshot.
  const runAsk = useCallback(
    async (
      text: string,
      opts: { pinnedSnapshot: string; session: string | null; markStale: boolean; isRetry: boolean },
    ) => {
      const trimmed = text.trim()
      if (!trimmed) return

      if (!opts.isRetry) {
        const userMsg: RenderedMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
        setMessages((m) => [...m, userMsg])
        setInput('')
      }
      setPendingError(null)
      setStaleAskPending(false)
      setStreaming(true)

      try {
        const result = await ask({
          // Inline the pinned CLAUDE.md ourselves rather than letting the SDK read disk.
          // That's how Figure 1 models the CLI's pin-at-session-start: Claude sees exactly
          // this snapshot, and an unpinned draft edit is genuinely absent from its context.
          systemPrompt: assembleSystemPrompt(opts.pinnedSnapshot, FIGURE1_EXTRA),
          userPrompt: trimmed,
          sessionId: opts.session,
        })
        // Show the reply right away — don't make the user wait on the gate judge to read it.
        const msgId = crypto.randomUUID()
        setMessages((m) => [
          ...m,
          { id: msgId, role: 'assistant', content: result.text, matchedText: null },
        ])
        if (result.sessionId) setSession(result.sessionId)
        setStreaming(false)

        // The gate: ask Claude which note (if any) the reply actually drew on — judged against
        // the notes Claude *saw* (the pinned snapshot), not the live draft. Semantic, so it
        // catches paraphrase the old consecutive-word matcher missed. Only runs when notes exist.
        const notes = getNoteEntries(opts.pinnedSnapshot)
        let matched: string | null = null
        let span: string | null = null
        if (notes.length > 0) {
          setJudging(true)
          try {
            const verdict = await judgeNoteReuse(notes, result.text)
            matched = verdict?.note ?? null
            span = verdict?.span ?? null
          } catch {
            matched = null // judge call failed — graceful; the reply is already shown
          } finally {
            setJudging(false)
          }
        }
        if (matched) {
          const hit = matched
          const hl = span
          setMessages((m) =>
            m.map((msg) =>
              msg.id === msgId ? { ...msg, matchedText: hit, highlightText: hl } : msg,
            ),
          )
          if (!completed) awardShape(figure.id, figure.shape, hit)
        }
        onMatchedText?.(matched)
        // Only nag "you didn't reload" when the ask both ran stale AND reused nothing — an ask
        // that matched a note is a success, never a stale miss. (Fixes earned + reload co-showing.)
        setStaleAskPending(opts.markStale && !matched)
      } catch (err) {
        // The ask failed, so there is no answer to critique — don't surface the
        // "that answer ignored your edit" reload nudge on top of an error. The
        // error UI below owns recovery; the reload nudge returns only after a real
        // stale reply actually lands.
        setStaleAskPending(false)
        // 529 and 429 each get a calm dedicated UI instead of an inline
        // "Error: …" message in the chat. Everything else falls through to
        // the generic error-as-assistant-message path.
        if (isOverloadedError(err)) {
          setPendingError({ kind: 'overloaded', text: trimmed })
        } else if (isRateLimitError(err)) {
          setPendingError({ kind: 'rate-limit', text: trimmed })
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
    [figure, awardShape, completed, onMatchedText, setSession],
  )

  // A normal send from the textarea (or a 529 retry). Here is where the reload progression
  // lives:
  //   • not dirty                 → ask against the pinned copy (already in sync)
  //   • dirty, grace not spent    → edit #1: silently reload (draft → pinned) into a fresh
  //                                 session, then ask. "Your first session reads CLAUDE.md."
  //   • dirty, grace already spent→ edit #2+: ask against the *stale* pinned copy so the reply
  //                                 visibly ignores the edit, then surface the reload nudge.
  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const isRetry = pendingError != null && pendingError.text === trimmed
      const dirty = claudeMd !== pinnedClaudeMd
      const grace = dirty && !graceUsed
      const stale = dirty && graceUsed
      const pinnedSnapshot = grace ? claudeMd : pinnedClaudeMd
      let session = sessionIdRef.current
      if (grace) {
        reloadContext() // persist draft → pinned + spend grace (for future renders / UI)
        setSession(null) // first session is fresh
        session = null
      }
      setNotesLoading(grace) // stage the note only when one is actually loading
      void runAsk(trimmed, { pinnedSnapshot, session, markStale: stale, isRetry })
    },
    [pendingError, claudeMd, pinnedClaudeMd, graceUsed, reloadContext, setSession, runAsk],
  )

  // The explicit reload — the lesson made physical. Pins the draft, starts a fresh context,
  // drops a "Context reloaded" divider, then re-asks the last question so the user sees the
  // same question now land on their edit.
  const handleReload = useCallback(() => {
    if (streaming) return
    const draftSnapshot = claudeMd
    const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.content ?? null
    reloadContext()
    setSession(null)
    setStaleAskPending(false)
    setNotesLoading(true) // the re-ask after a reload is exactly when the note loads
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'divider', content: 'Context reloaded — CLAUDE.md re-read' },
    ])
    if (lastUserText) {
      // Fresh context, pinned now equals the draft → a clean ask that lands the edit.
      void runAsk(lastUserText, {
        pinnedSnapshot: draftSnapshot,
        session: null,
        markStale: false,
        isRetry: false,
      })
    }
  }, [streaming, claudeMd, messages, reloadContext, setSession, runAsk])

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
    setSession(null)
    setPendingError(null)
    setStaleAskPending(false)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(messagesStorageKey)
    }
  }, [setSession, messagesStorageKey])

  const lastAssistant = messages.filter((m) => m.role === 'assistant').slice(-1)[0]
  const showSuccess = !judging && completed && lastAssistant?.matchedText
  const isEmpty = messages.length === 0
  // The reload nudge wins over the generic follow-up nudge: when an ask ran stale, the reason
  // the note didn't land is staleness, not a too-general note, so don't tell them to reword.
  // All result banners wait for the gate verdict (!judging) so nothing flashes before it lands.
  const showReloadNudge = !streaming && !judging && staleAskPending
  const showFollowUpNudge =
    !streaming &&
    !judging &&
    !staleAskPending &&
    lastAssistant &&
    !lastAssistant.matchedText &&
    !completed

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
                It&apos;s your project&apos;s standing instructions. Claude loads it when a
                session starts and keeps it in context for every reply — so anything you pin
                here shapes how Claude answers, not just in this conversation but every time
                someone runs Claude Code in this project. Most users never open it.
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
                your pinned notes land, and the whole file is loaded into Claude&apos;s context
                when a session starts — that&apos;s the trick.
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
          ) : m.role === 'divider' ? (
            <div
              key={m.id}
              className="text-text-tertiary my-4 flex items-center gap-2"
              role="separator"
            >
              <div className="bg-border-subtle h-px flex-1" />
              <RefreshCw className="size-3 shrink-0" />
              <span className="text-[10px] uppercase tracking-[0.12em]">{m.content}</span>
              <div className="bg-border-subtle h-px flex-1" />
            </div>
          ) : (
            <div
              key={m.id}
              ref={(el) => {
                messageRefs.current[m.id] = el
              }}
            >
              <ClaudeMessage>
                <ClaudeMarkdown text={m.content} highlight={m.highlightText ?? m.matchedText ?? null} />
              </ClaudeMessage>
              <div className="-mt-1 mb-3 flex items-center gap-3 pl-4">
                <PromoteButton sourceText={m.content} />
              </div>
            </div>
          ),
        )}

        {streaming && (
          <ThinkingState kind={figure.shape} tips={figure.tips} noteInPlay={notesLoading} size={140} />
        )}

        {judging && (
          <div className="text-text-tertiary px-4 pb-1 text-xs">checking your notes…</div>
        )}

        {/* Transient error affordance — only shown when a send hit a 529 or
           429 AND a retry isn't currently in flight. Renders the right kind
           of notice based on which error fired. */}
        {pendingError && !streaming && (
          <div className="mt-3">
            <OverloadNotice
              kind={pendingError.kind}
              onRetry={() => handleSend(pendingError.text)}
            />
          </div>
        )}
      </div>

      {showSuccess && (
        <div className="rounded-md border border-[color:var(--color-accent-strong)] bg-[color:var(--color-accent)]/5 p-4 text-sm">
          <div className="text-text-primary mb-1 flex items-center gap-2 font-semibold">
            <Shape kind={figure.shape} size={24} earned animate="always" />
            Circle earned
          </div>
          <p className="text-text-secondary m-0">
            Claude just reused something <em>you</em> wrote. That&apos;s the whole trick — your
            CLAUDE.md is project context Claude loaded for this session, not just chatter from
            earlier in this conversation.
          </p>
        </div>
      )}

      {/* The "let them feel it" moment. The reply just ran without their latest edit; name the
         real Claude Code gotcha and offer the reload that applies it. */}
      {showReloadNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-secondary m-0">
            That answer didn&apos;t use your latest CLAUDE.md edit — Claude can&apos;t see changes
            you make <em>after</em> a session starts. In Claude Code you&apos;d run{' '}
            <code className="font-mono">/clear</code>, <code className="font-mono">/compact</code>,
            or restart to reload the file. Same idea here:
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-3"
            onClick={handleReload}
            disabled={streaming}
          >
            <RefreshCw className="size-3.5" />
            Reload context
          </Button>
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
