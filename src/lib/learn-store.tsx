'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { FigureId, ShapeKind } from './figures/types'
import { SEED_CLAUDE_MD } from './figures/figure-1'
import { appendNoteToMarkdown } from './figures/registry'
import { writeClaudeMd } from './ai/client'

type LearnState = {
  earnedShapes: ShapeKind[]
  matchedAt: Partial<Record<FigureId, string>>
  // The full CLAUDE.md as a single markdown string — the *live draft* the user edits.
  // We parse out specific sections (Notes, Behavior) elsewhere when needed.
  claudeMd: string
  // The CLAUDE.md *as Claude currently sees it* — the "pinned" copy loaded into the
  // active context. Figure 1 inlines THIS (not the draft) into its system prompt, so an
  // edit to `claudeMd` does not reach Claude until a reload copies draft → pinned. This is
  // how we model the real CLI gotcha: edits don't apply until you /clear, /compact, or
  // restart. The first edit gets a silent grace reload (see `graceUsed`); after that the
  // user has to reload explicitly. Verified 2026-06-01: the Agent SDK actually re-reads
  // CLAUDE.md every call, so this pinning is a deliberate teaching simulation, not the SDK's
  // own behavior.
  pinnedClaudeMd: string
  // Has the one-time "first edit just works" grace been spent? The first time the draft
  // diverges from pinned and the user asks, we reload silently (their first session reads
  // CLAUDE.md). Every divergence after that makes them feel the staleness and reload.
  graceUsed: boolean
  // Whether the CLAUDE.md drawer (rendered on every page) is currently expanded.
  claudeMdOpen: boolean
  // Whether the user has seen the final send-off screen. The sendoff is a
  // one-time moment — once viewed, returning to any figure (including 5)
  // shows that figure's regular workspace. Reset Progress (on /) clears
  // this so a fresh walk-through can earn the moment again.
  sendoffSeen: boolean
}

type LearnStore = LearnState & {
  isCompleted: (id: FigureId) => boolean
  isUnlocked: (id: FigureId) => boolean
  // True when the draft has unpinned edits Claude can't see yet (draft !== pinned).
  isDirty: boolean
  awardShape: (id: FigureId, shape: ShapeKind, evidence: string) => void
  setClaudeMd: (text: string) => void
  appendNote: (text: string) => void
  // Copy the live draft into the pinned copy (and mark the grace spent). Models a
  // /clear · /compact · restart — after this, Claude sees the latest CLAUDE.md.
  reloadContext: () => void
  setClaudeMdOpen: (open: boolean) => void
  markSendoffSeen: () => void
  reset: () => void
}

const STORAGE_KEY = 'education-labs:learn'

const INITIAL: LearnState = {
  earnedShapes: [],
  matchedAt: {},
  claudeMd: SEED_CLAUDE_MD,
  // Draft and pinned start identical (not dirty), and no grace spent yet.
  pinnedClaudeMd: SEED_CLAUDE_MD,
  graceUsed: false,
  claudeMdOpen: false,
  sendoffSeen: false,
}

const LearnContext = createContext<LearnStore | null>(null)

// Earlier versions of this prototype stored CLAUDE.md as `{stack, behavior, userEntries[]}`.
// Migrate that shape into the new single-string form on load.
function migrateClaudeMd(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object') {
    const obj = raw as {
      stack?: string
      behavior?: string[]
      userEntries?: Array<{ text?: string }>
    }
    const parts: string[] = []
    if (obj.stack) parts.push(`## About this project\n\n${obj.stack.trim()}\n`)
    if (obj.behavior && obj.behavior.length > 0) {
      parts.push(
        `## How Claude should behave\n\n${obj.behavior.map((r) => `- ${r}`).join('\n')}\n`,
      )
    }
    const notes = (obj.userEntries ?? []).map((e) => e.text).filter(Boolean) as string[]
    parts.push(
      `## Notes\n\n${notes.length ? notes.map((n) => `- ${n}`).join('\n') + '\n' : ''}`,
    )
    if (parts.length > 0) return parts.join('\n')
  }
  return SEED_CLAUDE_MD
}

export function LearnProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearnState>(INITIAL)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<LearnState> & { claudeMd?: unknown }
        if (parsed) {
          const draft = migrateClaudeMd(parsed.claudeMd)
          // pinnedClaudeMd may be absent (pre-feature storage or a user mid-progress when
          // this shipped). Default it to the draft so an existing user is never spuriously
          // "dirty" on load — and treat any non-seed draft as evidence the grace was already
          // spent, so we don't hand a returning user a fresh first-edit grace.
          const pinned =
            typeof parsed.pinnedClaudeMd === 'string' && parsed.pinnedClaudeMd
              ? parsed.pinnedClaudeMd
              : draft
          setState({
            earnedShapes: parsed.earnedShapes ?? [],
            matchedAt: parsed.matchedAt ?? {},
            claudeMd: draft,
            pinnedClaudeMd: pinned,
            graceUsed: parsed.graceUsed ?? draft.trim() !== SEED_CLAUDE_MD.trim(),
            // claudeMdOpen is session state, not progress — always start closed
            // on a fresh page load. Persisting it means opening the drawer on one
            // figure leaves it open on every subsequent page.
            claudeMdOpen: false,
            sendoffSeen: parsed.sendoffSeen ?? false,
          })
        }
      } catch {
        /* corrupt — keep initial */
      }
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      // Exclude claudeMdOpen from persistence so the drawer state doesn't leak
      // across page transitions. Everything else (earned shapes, matchedAt,
      // claudeMd content) is real progress and must survive a reload.
      const { claudeMdOpen: _unused, ...persisted } = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    }
  }, [state, hydrated])

  // One-way sync the *pinned* CLAUDE.md → on-disk ./CLAUDE.md. Disk mirrors what Claude
  // currently sees, NOT the live draft — so figures that read the file through the Agent SDK
  // (settingSources, on figures 2 and 5) respect the same reload boundary as figure 1: a draft
  // edit doesn't reach Claude until a reload pins it. pinnedClaudeMd only changes on a reload
  // (rare), so there's no debounce. Silently no-ops in production where /api/claude-md is gone.
  useEffect(() => {
    if (!hydrated) return
    writeClaudeMd(state.pinnedClaudeMd).catch(() => {
      /* api mode or production — disk write unavailable */
    })
  }, [state.pinnedClaudeMd, hydrated])

  const isCompleted = useCallback(
    (id: FigureId) => state.matchedAt[id] != null,
    [state.matchedAt],
  )

  const isUnlocked = useCallback(
    (id: FigureId) => {
      if (id === 1) return true
      return isCompleted((id - 1) as FigureId)
    },
    [isCompleted],
  )

  const awardShape = useCallback((id: FigureId, shape: ShapeKind, evidence: string) => {
    setState((prev) => {
      if (prev.matchedAt[id]) return prev
      return {
        ...prev,
        earnedShapes: [...prev.earnedShapes, shape],
        matchedAt: { ...prev.matchedAt, [id]: evidence },
      }
    })
  }, [])

  const setClaudeMd = useCallback((text: string) => {
    setState((prev) => ({ ...prev, claudeMd: text }))
  }, [])

  const appendNote = useCallback((text: string) => {
    setState((prev) => ({ ...prev, claudeMd: appendNoteToMarkdown(prev.claudeMd, text) }))
  }, [])

  // Copy draft → pinned and spend the grace. Idempotent: a no-op when already in sync and
  // grace already spent, so calling it on a clean ask doesn't churn state. Synchronous —
  // Figure 1 reads `pinnedClaudeMd` straight from the store (no disk round-trip), so there's
  // nothing to await and no write race to lose.
  const reloadContext = useCallback(() => {
    setState((prev) =>
      prev.pinnedClaudeMd === prev.claudeMd && prev.graceUsed
        ? prev
        : { ...prev, pinnedClaudeMd: prev.claudeMd, graceUsed: true },
    )
  }, [])

  const setClaudeMdOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, claudeMdOpen: open }))
  }, [])

  const markSendoffSeen = useCallback(() => {
    setState((prev) => (prev.sendoffSeen ? prev : { ...prev, sendoffSeen: true }))
  }, [])

  const reset = useCallback(() => setState(INITIAL), [])

  const value = useMemo<LearnStore>(
    () => ({
      ...state,
      isCompleted,
      isUnlocked,
      isDirty: state.claudeMd !== state.pinnedClaudeMd,
      awardShape,
      setClaudeMd,
      appendNote,
      reloadContext,
      setClaudeMdOpen,
      markSendoffSeen,
      reset,
    }),
    [
      state,
      isCompleted,
      isUnlocked,
      awardShape,
      setClaudeMd,
      appendNote,
      reloadContext,
      setClaudeMdOpen,
      markSendoffSeen,
      reset,
    ],
  )

  return <LearnContext.Provider value={value}>{children}</LearnContext.Provider>
}

export function useLearnStore() {
  const ctx = useContext(LearnContext)
  if (!ctx) throw new Error('useLearnStore must be used within LearnProvider')
  return ctx
}
