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
import type { ClaudeMdState, LevelId, ShapeKind, UserEntry } from './levels/types'
import { SEED_CLAUDE_MD } from './levels/level-1'

type LearnState = {
  earnedShapes: ShapeKind[]
  // For each completed level, a snapshot of what triggered the gate. UI uses this to highlight.
  matchedAt: Partial<Record<LevelId, string>>
  claudeMd: ClaudeMdState
}

type LearnStore = LearnState & {
  isCompleted: (id: LevelId) => boolean
  isUnlocked: (id: LevelId) => boolean
  awardShape: (id: LevelId, shape: ShapeKind, evidence: string) => void
  // CLAUDE.md authoring
  setStack: (text: string) => void
  promoteEntry: (text: string, source: 'user' | 'claude') => UserEntry
  removeEntry: (id: string) => void
  editEntry: (id: string, text: string) => void
  addBehaviorRule: (rule: string) => void
  removeBehaviorRule: (index: number) => void
  editBehaviorRule: (index: number, rule: string) => void
  reset: () => void
}

const STORAGE_KEY = 'education-labs:learn'

const INITIAL: LearnState = {
  earnedShapes: [],
  matchedAt: {},
  claudeMd: SEED_CLAUDE_MD,
}

const LearnContext = createContext<LearnStore | null>(null)

function freshId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

export function LearnProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearnState>(INITIAL)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<LearnState>
        if (parsed) {
          setState({
            earnedShapes: parsed.earnedShapes ?? [],
            matchedAt: parsed.matchedAt ?? {},
            claudeMd: {
              stack: parsed.claudeMd?.stack ?? SEED_CLAUDE_MD.stack,
              behavior: parsed.claudeMd?.behavior ?? SEED_CLAUDE_MD.behavior,
              userEntries: parsed.claudeMd?.userEntries ?? [],
            },
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

  const setStack = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      claudeMd: { ...prev.claudeMd, stack: trimmed },
    }))
  }, [])

  const promoteEntry = useCallback<LearnStore['promoteEntry']>((text, source) => {
    const entry: UserEntry = {
      id: freshId(),
      text: text.trim(),
      source,
      promotedAt: Date.now(),
    }
    setState((prev) => ({
      ...prev,
      claudeMd: { ...prev.claudeMd, userEntries: [...prev.claudeMd.userEntries, entry] },
    }))
    return entry
  }, [])

  const removeEntry = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      claudeMd: {
        ...prev.claudeMd,
        userEntries: prev.claudeMd.userEntries.filter((e) => e.id !== id),
      },
    }))
  }, [])

  const editEntry = useCallback((id: string, text: string) => {
    setState((prev) => ({
      ...prev,
      claudeMd: {
        ...prev.claudeMd,
        userEntries: prev.claudeMd.userEntries.map((e) =>
          e.id === id ? { ...e, text: text.trim() } : e,
        ),
      },
    }))
  }, [])

  const addBehaviorRule = useCallback((rule: string) => {
    const trimmed = rule.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      claudeMd: { ...prev.claudeMd, behavior: [...prev.claudeMd.behavior, trimmed] },
    }))
  }, [])

  const removeBehaviorRule = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      claudeMd: {
        ...prev.claudeMd,
        behavior: prev.claudeMd.behavior.filter((_, i) => i !== index),
      },
    }))
  }, [])

  const editBehaviorRule = useCallback((index: number, rule: string) => {
    const trimmed = rule.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      claudeMd: {
        ...prev.claudeMd,
        behavior: prev.claudeMd.behavior.map((r, i) => (i === index ? trimmed : r)),
      },
    }))
  }, [])

  const reset = useCallback(() => setState(INITIAL), [])

  const value = useMemo<LearnStore>(
    () => ({
      ...state,
      isCompleted,
      isUnlocked,
      awardShape,
      setStack,
      promoteEntry,
      removeEntry,
      editEntry,
      addBehaviorRule,
      removeBehaviorRule,
      editBehaviorRule,
      reset,
    }),
    [
      state,
      isCompleted,
      isUnlocked,
      awardShape,
      setStack,
      promoteEntry,
      removeEntry,
      editEntry,
      addBehaviorRule,
      removeBehaviorRule,
      editBehaviorRule,
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
