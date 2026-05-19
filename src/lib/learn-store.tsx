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
  // The full CLAUDE.md as a single markdown string. The user can edit this freely;
  // we parse out specific sections (Notes, Behavior) elsewhere when needed.
  claudeMd: string
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
  awardShape: (id: FigureId, shape: ShapeKind, evidence: string) => void
  setClaudeMd: (text: string) => void
  appendNote: (text: string) => void
  setClaudeMdOpen: (open: boolean) => void
  markSendoffSeen: () => void
  reset: () => void
}

const STORAGE_KEY = 'education-labs:learn'

const INITIAL: LearnState = {
  earnedShapes: [],
  matchedAt: {},
  claudeMd: SEED_CLAUDE_MD,
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
          setState({
            earnedShapes: parsed.earnedShapes ?? [],
            matchedAt: parsed.matchedAt ?? {},
            claudeMd: migrateClaudeMd(parsed.claudeMd),
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

  // One-way sync browser CLAUDE.md → on-disk ./CLAUDE.md so the spawned `claude` (CLI mode)
  // reads what the user authored. Debounced. Silently no-ops in API mode / production where
  // the /api/claude-md route is unavailable.
  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      writeClaudeMd(state.claudeMd).catch(() => {
        /* api mode or production — disk write unavailable */
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [state.claudeMd, hydrated])

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
      awardShape,
      setClaudeMd,
      appendNote,
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
