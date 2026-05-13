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

type LearnState = {
  earnedShapes: ShapeKind[]
  // For each completed level, the fingerprint that matched. Useful for highlighting in UI.
  matchedFingerprints: Partial<Record<LevelId, string>>
}

type LearnStore = LearnState & {
  isCompleted: (id: LevelId) => boolean
  isUnlocked: (id: LevelId) => boolean
  awardShape: (id: LevelId, shape: ShapeKind, matchedFingerprint: string) => void
  reset: () => void
}

const STORAGE_KEY = 'education-labs:learn'

const INITIAL: LearnState = {
  earnedShapes: [],
  matchedFingerprints: {},
}

const LearnContext = createContext<LearnStore | null>(null)

export function LearnProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearnState>(INITIAL)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LearnState
        if (parsed && Array.isArray(parsed.earnedShapes)) {
          setState({
            earnedShapes: parsed.earnedShapes,
            matchedFingerprints: parsed.matchedFingerprints ?? {},
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
    (id: LevelId) => state.matchedFingerprints[id] != null,
    [state.matchedFingerprints],
  )

  const isUnlocked = useCallback(
    (id: LevelId) => {
      if (id === 1) return true
      return isCompleted((id - 1) as LevelId)
    },
    [isCompleted],
  )

  const awardShape = useCallback(
    (id: LevelId, shape: ShapeKind, matchedFingerprint: string) => {
      setState((prev) => {
        if (prev.matchedFingerprints[id]) return prev // idempotent
        return {
          earnedShapes: [...prev.earnedShapes, shape],
          matchedFingerprints: { ...prev.matchedFingerprints, [id]: matchedFingerprint },
        }
      })
    },
    [],
  )

  const reset = useCallback(() => setState(INITIAL), [])

  const value = useMemo<LearnStore>(
    () => ({ ...state, isCompleted, isUnlocked, awardShape, reset }),
    [state, isCompleted, isUnlocked, awardShape, reset],
  )

  return <LearnContext.Provider value={value}>{children}</LearnContext.Provider>
}

export function useLearnStore() {
  const ctx = useContext(LearnContext)
  if (!ctx) throw new Error('useLearnStore must be used within LearnProvider')
  return ctx
}
