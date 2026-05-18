/**
 * Saved-pose library for the pose editor.
 *
 * A pose is a snapshot of the scene's shapes at a moment in time. Poses are
 * persisted to localStorage so they survive page reloads.
 *
 * Naming: each pose has a user-supplied name (e.g. "walking forward", "bow",
 * "kick left"). Names don't have to be unique \u2014 the ID is. The user can
 * rename freely.
 *
 * Loading a pose replaces the current scene's shapes (not its viewBox or
 * metadata). The parent component is responsible for clearing the undo
 * history after a pose load, since the new pose is a discontinuous starting
 * point.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Pose, Shape } from './types'

const STORAGE_KEY = 'pose-editor:saved-poses'

function loadPersistedPoses(): Pose[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as Pose[]
    if (!Array.isArray(parsed)) return []
    // Cheap shape validation \u2014 enough to reject obvious corruption.
    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        Array.isArray(p.shapes),
    )
  } catch {
    return []
  }
}

export function useSavedPoses() {
  const [poses, setPoses] = useState<Pose[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Load on mount.
  useEffect(() => {
    setPoses(loadPersistedPoses())
    setHydrated(true)
  }, [])

  // Persist on change (after hydration so we don't overwrite with empty).
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(poses))
    } catch {
      /* quota / private mode */
    }
  }, [poses, hydrated])

  const savePose = useCallback((name: string, shapes: Shape[]): Pose => {
    const newPose: Pose = {
      id: `pose-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || 'Untitled pose',
      shapes: deepClone(shapes),
      createdAt: Date.now(),
    }
    setPoses((prev) => [...prev, newPose])
    return newPose
  }, [])

  const renamePose = useCallback((id: string, name: string) => {
    setPoses((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: name.trim() || 'Untitled pose' } : p)),
    )
  }, [])

  const deletePose = useCallback((id: string) => {
    setPoses((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const updatePose = useCallback((id: string, shapes: Shape[]) => {
    setPoses((prev) =>
      prev.map((p) => (p.id === id ? { ...p, shapes: deepClone(shapes) } : p)),
    )
  }, [])

  return {
    poses,
    savePose,
    renamePose,
    deletePose,
    updatePose,
    hydrated,
  }
}

// Deep-clone shapes so saved poses don't share references with the live scene.
// Without this, future drags would mutate the saved pose's data.
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
