/**
 * Move playback controller.
 *
 * Drives a single move's playback via requestAnimationFrame. Exposes:
 *   - currentTimeMs: where the playhead is now (ms)
 *   - isPlaying: boolean
 *   - play / pause / seek / restart
 *
 * Looping is handled internally: if move.loop is true, on reaching durationMs
 * we wrap back to 0 and keep going. If not looping, we stop at durationMs.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Move } from './types'

export function useMovePlayback(move: Move | null) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const rafRef = useRef<number | null>(null)
  // Wall-clock time when the current play segment began, paired with the
  // currentTimeMs at that wall-clock moment. We compute new currentTimeMs as
  // (now - segmentStartWallTime) + segmentStartCurrentTime. This lets pause
  // and resume work correctly.
  const segmentStartRef = useRef<{ wall: number; current: number } | null>(null)

  const tick = useCallback(() => {
    if (!move) return
    const segStart = segmentStartRef.current
    if (!segStart) return
    const now = performance.now()
    let elapsed = now - segStart.wall + segStart.current

    if (elapsed >= move.durationMs) {
      if (move.loop) {
        // Wrap around. Reset segment so subsequent ticks compute correctly.
        elapsed = elapsed % move.durationMs
        segmentStartRef.current = { wall: now, current: elapsed }
      } else {
        // Hit end, stop.
        setCurrentTimeMs(move.durationMs)
        setIsPlaying(false)
        segmentStartRef.current = null
        rafRef.current = null
        return
      }
    }

    setCurrentTimeMs(elapsed)
    rafRef.current = requestAnimationFrame(tick)
  }, [move])

  const play = useCallback(() => {
    if (!move || isPlaying) return
    setIsPlaying(true)
    segmentStartRef.current = {
      wall: performance.now(),
      current: currentTimeMs >= move.durationMs ? 0 : currentTimeMs,
    }
    if (currentTimeMs >= move.durationMs) setCurrentTimeMs(0)
    rafRef.current = requestAnimationFrame(tick)
  }, [move, isPlaying, currentTimeMs, tick])

  const pause = useCallback(() => {
    setIsPlaying(false)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    segmentStartRef.current = null
  }, [])

  const seek = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, ms)
      const final = move ? Math.min(clamped, move.durationMs) : clamped
      setCurrentTimeMs(final)
      if (isPlaying) {
        // Re-anchor segment so playback continues from the seeked position.
        segmentStartRef.current = { wall: performance.now(), current: final }
      }
    },
    [isPlaying, move],
  )

  const restart = useCallback(() => {
    seek(0)
    if (!isPlaying) play()
  }, [seek, isPlaying, play])

  // Stop playback if the move changes or unmounts.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // If the move changes, reset to 0 and stop.
  useEffect(() => {
    setCurrentTimeMs(0)
    setIsPlaying(false)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    segmentStartRef.current = null
  }, [move?.id])

  return { currentTimeMs, isPlaying, play, pause, seek, restart }
}
