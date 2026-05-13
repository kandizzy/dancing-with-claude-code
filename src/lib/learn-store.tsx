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
import type { LevelId, ShapeKind } from './levels/types'
import { SEED_CLAUDE_MD } from './levels/level-1'
import { appendNoteToMarkdown } from './levels/registry'

type LearnState = {
  earnedShapes: ShapeKind[]
  matchedAt: Partial<Record<LevelId, string>>
  // The full CLAUDE.md as a single markdown string. The user can edit this freely;
  // we parse out specific sections (Notes, Behavior) elsewhere when needed.
  claudeMd: string
  // Whether the CLAUDE.md drawer (rendered on every page) is currently expanded.
  claudeMdOpen: boolean
}

type LearnStore = LearnState & {
  isCompleted: (id: LevelId) => boolean
  isUnlocked: (id: LevelId) => boolean
  awardShape: (id: LevelId, shape: ShapeKind, evidence: string) => void
  setClaudeMd: (text: string) => void
  appendNote: (text: string) => void
  setClaudeMdOpen: (open: boolean) => void
  reset: () => void
}

const STORAGE_KEY = 'education-labs:learn'

const INITIAL: LearnState = {
  earnedShapes: [],
  matchedAt: {},
  claudeMd: SEED_CLAUDE_MD,
  claudeMdOpen: false,
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
            claudeMdOpen: parsed.claudeMdOpen ?? false,
          })
        }
      } catch {
        /* corrupt — keep initial */
      }
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const isCompleted = useCallback(
    (id: LevelId) => state.matchedAt[id] != null,
    [state.matchedAt],
  )

  const isUnlocked = useCallback(
    (id: LevelId) => {
      if (id === 1) return true
      return isCompleted((id - 1) as LevelId)
    },
    [isCompleted],
  )

  const awardShape = useCallback((id: LevelId, shape: ShapeKind, evidence: string) => {
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
