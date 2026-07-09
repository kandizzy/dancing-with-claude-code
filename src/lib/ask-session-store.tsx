'use client'

/**
 * Conversation store for the two chat figures (1 and 2).
 *
 * Why this exists: asks are plain awaited fetches, and navigation was never
 * blocked — so leaving a figure mid-ask used to unmount the workspace and
 * silently drop the reply (and, on figure 1, the judge → award tail: an earn
 * could be lost). Hosting the messages, session ids, and the imperative ask
 * flows in a provider that never unmounts means an in-flight ask finishes in
 * the background and the reply is waiting when the user returns. The header
 * shows a "Claude is working on figure N" pill while that's true.
 *
 * Figures 3–5 stay component-local on purpose: their asks are single-shot and
 * cheaply re-runnable form pipelines, not conversations.
 *
 * Mounted inside LearnProvider (figure 1's completion chain needs awardShape
 * and the CLAUDE.md pin state).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ask, isOverloadedError, isRateLimitError, judgeNoteReuse } from '@/lib/ai/client'
import { assembleSystemPrompt, getNoteEntries } from '@/lib/figures/registry'
import { figure1 } from '@/lib/figures/figure-1'
import { figure2 } from '@/lib/figures/figure-2'
import { useLearnStore } from '@/lib/learn-store'
import type { FigureId } from '@/lib/figures/types'

export type ChatMessage = {
  id: string
  // 'divider' is a non-conversational marker rendered inline in the transcript — e.g. the
  // "Context reloaded" beat. It is never sent to Claude.
  role: 'user' | 'assistant' | 'divider'
  content: string
  // The note (if any) this reply reused — drives the "Circle earned" banner and the award.
  matchedText?: string | null
  // The verbatim span of THIS reply to highlight (the applied text the judge pointed at).
  highlightText?: string | null
  // Figure 2: the slash command this user turn was sent through, if any.
  viaSlash?: string
}

export type PendingAskError = { kind: 'overloaded' | 'rate-limit'; text: string } | null

/**
 * Defensive validator for messages rehydrating from localStorage. Drops anything
 * that doesn't look like a normal rendered message, including content that's
 * literally the SDK result envelope serialized as a string — which has appeared
 * in the wild when an SDK error path packaged its own envelope into the text
 * field. Without this, a single bad message that lands in storage persists
 * across reloads forever, leaving the chat looking permanently broken.
 */
function isValidMessage(m: unknown): m is ChatMessage {
  if (typeof m !== 'object' || m === null) return false
  const obj = m as Record<string, unknown>
  if (typeof obj.id !== 'string' || !obj.id) return false
  if (obj.role !== 'user' && obj.role !== 'assistant' && obj.role !== 'divider') return false
  if (typeof obj.content !== 'string' || !obj.content.trim()) return false
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

const F2_SYSTEM = `You are Claude, the co-pilot in a browser-based webcam project the user has cloned locally. The user just sent a message. If it was a slash command, honor whatever the command body asks for. If it was a follow-up to your previous message in this conversation, respond in light of what came before — including answering single-word or single-number replies (e.g. "2" answering "which figure?"). Keep replies short (1–3 short paragraphs).`

const storageKeys = (id: FigureId) => ({
  session: `education-labs:figure-${id}:session-id`,
  messages: `education-labs:figure-${id}:messages`,
})

type Fig1Slice = {
  messages: ChatMessage[]
  streaming: boolean
  judging: boolean
  staleAskPending: boolean
  notesLoading: boolean
  pendingError: PendingAskError
  /** A normal send from the textarea (or a 529 retry — same text re-sent). */
  send: (text: string) => void
  /** The explicit reload: pin the draft, fresh context, divider, re-ask the last question. */
  reload: () => void
  /** Re-ask the last user message without appending a duplicate turn (interrupted-ask recovery). */
  reask: () => void
  clear: () => void
}

type Fig2Slice = {
  messages: ChatMessage[]
  streaming: boolean
  /**
   * Send an (already slash-expanded) prompt. `display` is what the transcript
   * shows; `append: false` re-runs a turn whose user message is already in the
   * transcript (interrupted-ask recovery).
   */
  send: (opts: { prompt: string; display: string; viaSlash?: string; append?: boolean }) => void
  stop: () => void
}

type AskSessionStore = {
  fig1: Fig1Slice
  fig2: Fig2Slice
  /** Which figure has an ask in flight (judging counts — the verdict is part of the turn). */
  pending: { figureId: FigureId } | null
}

const AskSessionContext = createContext<AskSessionStore | null>(null)

export function AskSessionProvider({ children }: { children: React.ReactNode }) {
  const { awardShape, isCompleted, claudeMd, pinnedClaudeMd, graceUsed, reloadContext } =
    useLearnStore()

  // --- Figure 1 conversation state -----------------------------------------
  const [messages1, setMessages1] = useState<ChatMessage[]>([])
  const [streaming1, setStreaming1] = useState(false)
  const [judging, setJudging] = useState(false)
  const [staleAskPending, setStaleAskPending] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)
  const [pendingError, setPendingError] = useState<PendingAskError>(null)
  // Held in a ref (not state) because nothing renders from it, and async flows (grace reload
  // → ask, manual reload → re-ask) need to read the freshly-reset value synchronously.
  const session1Ref = useRef<string | null>(null)

  // --- Figure 2 conversation state -----------------------------------------
  const [messages2, setMessages2] = useState<ChatMessage[]>([])
  const [streaming2, setStreaming2] = useState(false)
  const session2Ref = useRef<string | null>(null)
  const abort2Ref = useRef<AbortController | null>(null)

  // Single writer per figure for the SDK session id: keeps the ref and localStorage in
  // lockstep. Passing null clears it, which is how a reload starts a fresh context.
  const setSession = useCallback((id: FigureId, value: string | null) => {
    const ref = id === 1 ? session1Ref : session2Ref
    ref.current = value
    if (typeof window === 'undefined') return
    const key = storageKeys(id).session
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  }, [])

  // Rehydrate both conversations once on mount (the provider outlives route
  // changes, so this runs on full page loads only). Malformed entries dropped.
  useEffect(() => {
    if (typeof window === 'undefined') return
    for (const [id, setMessages] of [
      [1, setMessages1],
      [2, setMessages2],
    ] as const) {
      const keys = storageKeys(id)
      const storedSession = window.localStorage.getItem(keys.session)
      if (storedSession) (id === 1 ? session1Ref : session2Ref).current = storedSession
      const storedMessages = window.localStorage.getItem(keys.messages)
      if (storedMessages) {
        try {
          const parsed = JSON.parse(storedMessages) as unknown
          if (Array.isArray(parsed)) setMessages(parsed.filter(isValidMessage))
        } catch {
          // Corrupted JSON — ignore and let the chat start fresh.
        }
      }
    }
  }, [])

  // Persist messages whenever they change. Removes the key when empty so a clear
  // cleans up its own storage too.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = storageKeys(1).messages
    if (messages1.length === 0) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(messages1))
  }, [messages1])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = storageKeys(2).messages
    if (messages2.length === 0) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(messages2))
  }, [messages2])

  // --- Figure 1 flows -------------------------------------------------------

  // The core ask. Callers pass the exact CLAUDE.md snapshot Claude should see
  // (`pinnedSnapshot`) and the session to continue (or null for a fresh context), so this
  // never re-reads possibly-stale store values mid-flow. `markStale` tags the resulting
  // reply as one that ran without the user's latest edit (drives the reload nudge). Claude
  // only ever receives the inlined snapshot — no disk read — so the gate matches against
  // exactly what it saw. Runs to completion even if every figure page unmounts.
  const runAsk1 = useCallback(
    async (
      text: string,
      opts: { pinnedSnapshot: string; session: string | null; markStale: boolean; isRetry: boolean },
    ) => {
      const trimmed = text.trim()
      if (!trimmed) return

      if (!opts.isRetry) {
        setMessages1((m) => [...m, { id: crypto.randomUUID(), role: 'user', content: trimmed }])
      }
      setPendingError(null)
      setStaleAskPending(false)
      setStreaming1(true)

      try {
        const result = await ask({
          // Inline the pinned CLAUDE.md ourselves rather than letting the SDK read disk.
          // That's how figure 1 models the CLI's pin-at-session-start: Claude sees exactly
          // this snapshot, and an unpinned draft edit is genuinely absent from its context.
          systemPrompt: assembleSystemPrompt(opts.pinnedSnapshot, FIGURE1_EXTRA),
          userPrompt: trimmed,
          sessionId: opts.session,
        })
        // Show the reply right away — don't make the user wait on the gate judge to read it.
        const msgId = crypto.randomUUID()
        setMessages1((m) => [
          ...m,
          { id: msgId, role: 'assistant', content: result.text, matchedText: null },
        ])
        if (result.sessionId) setSession(1, result.sessionId)
        setStreaming1(false)

        // The gate: ask Claude which note (if any) the reply actually drew on — judged against
        // the notes Claude *saw* (the pinned snapshot), not the live draft. Semantic, so it
        // catches paraphrase. Only runs when notes exist.
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
          setMessages1((m) =>
            m.map((msg) =>
              msg.id === msgId ? { ...msg, matchedText: hit, highlightText: hl } : msg,
            ),
          )
          if (!isCompleted(figure1.id)) awardShape(figure1.id, figure1.shape, hit)
        }
        // Only nag "you didn't reload" when the ask both ran stale AND reused nothing — an ask
        // that matched a note is a success, never a stale miss.
        setStaleAskPending(opts.markStale && !matched)
      } catch (err) {
        // The ask failed, so there is no answer to critique — don't surface the
        // "that answer ignored your edit" reload nudge on top of an error.
        setStaleAskPending(false)
        if (isOverloadedError(err)) {
          setPendingError({ kind: 'overloaded', text: trimmed })
        } else if (isRateLimitError(err)) {
          setPendingError({ kind: 'rate-limit', text: trimmed })
        } else {
          const errMsg =
            (err as Error)?.message ?? 'Request failed. Check your terminal for details.'
          setMessages1((m) => [
            ...m,
            { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${errMsg}` },
          ])
        }
      } finally {
        setStreaming1(false)
      }
    },
    [awardShape, isCompleted, setSession],
  )

  // A normal send (or a 529 retry). Here is where the reload progression lives:
  //   • not dirty                  → ask against the pinned copy (already in sync)
  //   • dirty, grace not spent     → edit #1: silently reload (draft → pinned) into a fresh
  //                                  session, then ask. "Your first session reads CLAUDE.md."
  //   • dirty, grace already spent → edit #2+: ask against the *stale* pinned copy so the reply
  //                                  visibly ignores the edit, then surface the reload nudge.
  const send1 = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const isRetry = pendingError != null && pendingError.text === trimmed
      const dirty = claudeMd !== pinnedClaudeMd
      const grace = dirty && !graceUsed
      const stale = dirty && graceUsed
      const pinnedSnapshot = grace ? claudeMd : pinnedClaudeMd
      let session = session1Ref.current
      if (grace) {
        reloadContext() // persist draft → pinned + spend grace (for future renders / UI)
        setSession(1, null) // first session is fresh
        session = null
      }
      setNotesLoading(grace) // stage the note only when one is actually loading
      void runAsk1(trimmed, { pinnedSnapshot, session, markStale: stale, isRetry })
    },
    [pendingError, claudeMd, pinnedClaudeMd, graceUsed, reloadContext, setSession, runAsk1],
  )

  // The explicit reload — the lesson made physical. Pins the draft, starts a fresh context,
  // drops a "Context reloaded" divider, then re-asks the last question so the user sees the
  // same question now land on their edit.
  const reload1 = useCallback(() => {
    if (streaming1) return
    const draftSnapshot = claudeMd
    const lastUserText = [...messages1].reverse().find((m) => m.role === 'user')?.content ?? null
    reloadContext()
    setSession(1, null)
    setStaleAskPending(false)
    setNotesLoading(true) // the re-ask after a reload is exactly when the note loads
    setMessages1((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'divider', content: 'Context reloaded — CLAUDE.md re-read' },
    ])
    if (lastUserText) {
      // Fresh context, pinned now equals the draft → a clean ask that lands the edit.
      void runAsk1(lastUserText, {
        pinnedSnapshot: draftSnapshot,
        session: null,
        markStale: false,
        isRetry: false,
      })
    }
  }, [streaming1, claudeMd, messages1, reloadContext, setSession, runAsk1])

  // Interrupted-ask recovery: a full page reload mid-ask leaves the last user turn with no
  // reply. Re-run it against the current pinned copy without appending a duplicate turn.
  const reask1 = useCallback(() => {
    if (streaming1) return
    const lastUserText = [...messages1].reverse().find((m) => m.role === 'user')?.content
    if (!lastUserText) return
    void runAsk1(lastUserText, {
      pinnedSnapshot: pinnedClaudeMd,
      session: session1Ref.current,
      markStale: claudeMd !== pinnedClaudeMd && graceUsed,
      isRetry: true,
    })
  }, [streaming1, messages1, pinnedClaudeMd, claudeMd, graceUsed, runAsk1])

  /**
   * Clear figure 1's visible history AND the SDK-side session. "Clear" means:
   * forget this conversation, start fresh — but keep all earned shapes, the
   * CLAUDE.md, and progress (those live in the learn store, not the chat).
   */
  const clear1 = useCallback(() => {
    setMessages1([])
    setSession(1, null)
    setPendingError(null)
    setStaleAskPending(false)
  }, [setSession])

  // --- Figure 2 flow ---------------------------------------------------------

  const send2 = useCallback(
    (opts: { prompt: string; display: string; viaSlash?: string; append?: boolean }) => {
      if (streaming2) return
      if (opts.append !== false) {
        setMessages2((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: opts.display,
            viaSlash: opts.viaSlash,
          },
        ])
      }
      setStreaming2(true)
      const controller = new AbortController()
      abort2Ref.current = controller

      void (async () => {
        try {
          const result = await ask({
            systemPrompt: F2_SYSTEM,
            userPrompt: opts.prompt,
            sessionId: session2Ref.current,
            // Figure 2 needs both: project context loads .claude/commands/ so slash
            // commands work, and CLAUDE.md so the commands can reference notes.
            // No agent preset — this is text Q&A, not file editing.
            loadProjectContext: true,
            signal: controller.signal,
          })
          setMessages2((m) => [
            ...m,
            { id: crypto.randomUUID(), role: 'assistant', content: result.text },
          ])
          if (result.sessionId) setSession(2, result.sessionId)
          if (opts.viaSlash && !isCompleted(figure2.id)) {
            awardShape(figure2.id, figure2.shape, `invoked /${opts.viaSlash}`)
          }
        } catch (err) {
          // A stop is the user's own act, not a failure — note it quietly instead
          // of rendering the red error message.
          if ((err as Error)?.name === 'AbortError') {
            setMessages2((m) => [
              ...m,
              { id: crypto.randomUUID(), role: 'assistant', content: '_Stopped._' },
            ])
          } else {
            const errMsg = (err as Error)?.message ?? 'Request failed'
            setMessages2((m) => [
              ...m,
              { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${errMsg}` },
            ])
          }
        } finally {
          abort2Ref.current = null
          setStreaming2(false)
        }
      })()
    },
    [streaming2, setSession, isCompleted, awardShape],
  )

  const stop2 = useCallback(() => {
    abort2Ref.current?.abort()
  }, [])

  const value = useMemo<AskSessionStore>(
    () => ({
      fig1: {
        messages: messages1,
        streaming: streaming1,
        judging,
        staleAskPending,
        notesLoading,
        pendingError,
        send: send1,
        reload: reload1,
        reask: reask1,
        clear: clear1,
      },
      fig2: {
        messages: messages2,
        streaming: streaming2,
        send: send2,
        stop: stop2,
      },
      pending:
        streaming1 || judging
          ? { figureId: figure1.id }
          : streaming2
            ? { figureId: figure2.id }
            : null,
    }),
    [
      messages1,
      streaming1,
      judging,
      staleAskPending,
      notesLoading,
      pendingError,
      send1,
      reload1,
      reask1,
      clear1,
      messages2,
      streaming2,
      send2,
      stop2,
    ],
  )

  return <AskSessionContext.Provider value={value}>{children}</AskSessionContext.Provider>
}

export function useAskSession(): AskSessionStore {
  const ctx = useContext(AskSessionContext)
  if (!ctx) throw new Error('useAskSession must be used inside AskSessionProvider')
  return ctx
}
