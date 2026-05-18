/**
 * Undo/redo history for scene mutations.
 *
 * Granularity: one entry per drag gesture, not per move event. We push the
 * scene snapshot on drag-start, so undoing snaps back to the state before the
 * drag began.
 *
 * Storage: in-memory only. Survives within a session but not across reloads.
 * Phase 4 will add localStorage persistence for the current scene + saved poses,
 * but the undo stack stays ephemeral (matches common UX expectations — undo
 * isn't usually persisted).
 *
 * Stack size: capped at 50 entries. Beyond that, oldest entries are dropped.
 * Memory cost: each scene is small (under 50 shapes), so 50 snapshots is fine.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Scene } from './types'

type HistoryState = {
  past: Scene[]
  future: Scene[]
}

const MAX_HISTORY = 50
const STORAGE_KEY = 'pose-editor:current-scene'

/**
 * Load the persisted scene from localStorage. Returns null if nothing is stored
 * or if the stored data is corrupt. Falls back to the initial scene in that case.
 */
function loadPersistedScene(): Scene | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Scene
    // Cheap sanity check: must have an id, shapes array, dimensions.
    if (
      !parsed ||
      typeof parsed.id !== 'string' ||
      !Array.isArray(parsed.shapes) ||
      typeof parsed.width !== 'number' ||
      typeof parsed.height !== 'number'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function useSceneHistory(initial: Scene) {
  // Start with the initial scene on both server and client to keep SSR and
  // first-client-render in sync. We then load any persisted scene in an effect
  // after mount. This avoids hydration mismatches at the cost of a brief flash
  // of the default pose before the saved one appears (typically <100ms).
  const [scene, setScene] = useState<Scene>(initial)
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] })
  // `hydrated` flips true after the post-mount load runs. We gate the persist
  // effect on this so we don't overwrite localStorage with the default scene
  // during the initial render (before we've had a chance to load).
  const [hydrated, setHydrated] = useState(false)

  const sceneRef = useRef(scene)
  sceneRef.current = scene

  // Load persisted scene after mount. Only fires once.
  useEffect(() => {
    const persisted = loadPersistedScene()
    if (persisted) setScene(persisted)
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist the scene to localStorage whenever it changes — but only after we
  // hydrate. Otherwise the initial render would clobber any saved pose with
  // the default before the load effect runs.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scene))
      } catch {
        // localStorage can throw (quota, private mode, etc). Silent failure;
        // the in-memory scene is still valid.
      }
    }, 400)
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [scene, hydrated])

  // Push the current scene onto the undo stack. Called at drag-start.
  // Clears the redo stack because we're branching from this point forward.
  const pushHistory = useCallback(() => {
    setHistory((h) => ({
      past: [...h.past, sceneRef.current].slice(-MAX_HISTORY),
      future: [],
    }))
  }, [])

  // Update scene without touching history (used during drags, after the
  // gesture's pre-state has been pushed).
  const updateScene = useCallback((next: Scene | ((prev: Scene) => Scene)) => {
    setScene((prev) => (typeof next === 'function' ? next(prev) : next))
  }, [])

  // Update scene AND push the current scene onto the undo stack. Used for
  // discrete edits (e.g. reset, future "apply pose" buttons) where there's
  // no drag-start moment.
  const replaceScene = useCallback((next: Scene) => {
    setHistory((h) => ({
      past: [...h.past, sceneRef.current].slice(-MAX_HISTORY),
      future: [],
    }))
    setScene(next)
  }, [])

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h
      const previous = h.past[h.past.length - 1]
      const newPast = h.past.slice(0, -1)
      // Push the current scene onto future so redo works.
      setScene(previous)
      return {
        past: newPast,
        future: [sceneRef.current, ...h.future].slice(0, MAX_HISTORY),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h
      const next = h.future[0]
      const newFuture = h.future.slice(1)
      setScene(next)
      return {
        past: [...h.past, sceneRef.current].slice(-MAX_HISTORY),
        future: newFuture,
      }
    })
  }, [])

  // Clear the history entirely. Useful when loading a totally new scene
  // (e.g. picking a saved pose) where prior history is meaningless.
  const clearHistory = useCallback(() => {
    setHistory({ past: [], future: [] })
  }, [])

  return {
    scene,
    pushHistory,
    updateScene,
    replaceScene,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  }
}
