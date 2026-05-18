/**
 * Saved-moves library.
 *
 * A move is a timeline of clips played over a start pose. Persisted to
 * localStorage. Same pattern as useSavedPoses.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Move, MoveClip } from './types'

const STORAGE_KEY = 'pose-editor:saved-moves'

function loadPersistedMoves(): Move[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as Move[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        typeof m.name === 'string' &&
        Array.isArray(m.clips),
    )
  } catch {
    return []
  }
}

export function useSavedMoves() {
  const [moves, setMoves] = useState<Move[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setMoves(loadPersistedMoves())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(moves))
    } catch {
      /* quota / private mode */
    }
  }, [moves, hydrated])

  const createMove = useCallback((name: string, startPoseId: string): Move => {
    const newMove: Move = {
      id: `move-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || 'Untitled move',
      startPoseId,
      clips: [],
      durationMs: 1000,
      loop: true,
      createdAt: Date.now(),
    }
    setMoves((prev) => [...prev, newMove])
    return newMove
  }, [])

  const renameMove = useCallback((id: string, name: string) => {
    setMoves((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: name.trim() || 'Untitled move' } : m)),
    )
  }, [])

  const deleteMove = useCallback((id: string) => {
    setMoves((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const updateMove = useCallback((id: string, patch: Partial<Move>) => {
    setMoves((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const addClip = useCallback((moveId: string, clip: Omit<MoveClip, 'id'>) => {
    const newClip: MoveClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }
    setMoves((prev) =>
      prev.map((m) => (m.id === moveId ? { ...m, clips: [...m.clips, newClip] } : m)),
    )
    return newClip
  }, [])

  const updateClip = useCallback(
    (moveId: string, clipId: string, patch: Partial<MoveClip>) => {
      setMoves((prev) =>
        prev.map((m) =>
          m.id !== moveId
            ? m
            : {
                ...m,
                clips: m.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
              },
        ),
      )
    },
    [],
  )

  const deleteClip = useCallback((moveId: string, clipId: string) => {
    setMoves((prev) =>
      prev.map((m) =>
        m.id !== moveId
          ? m
          : { ...m, clips: m.clips.filter((c) => c.id !== clipId) },
      ),
    )
  }, [])

  return {
    moves,
    createMove,
    renameMove,
    deleteMove,
    updateMove,
    addClip,
    updateClip,
    deleteClip,
    hydrated,
  }
}
