'use client'

import { useRef } from 'react'
import { useRafLoop, useReducedMotion } from '@/lib/anim'
import { cn } from '@/lib/utils'

const ROTATE_MS = 4500

/**
 * Rotating "did you know" teaching lines shown during the wait, so the time spent watching the
 * thinking shape actually teaches something. Cycles the figure's `tips` on a gentle timer
 * (driven off the shared rAF loop, so it's one source of motion and respects reduced-motion —
 * which pins a single static line). Renders nothing if there are no tips. Updates textContent
 * via a ref rather than React state so rotation doesn't re-render the chat.
 */
export function WaitingTips({ tips, className }: { tips?: string[]; className?: string }) {
  const ref = useRef<HTMLParagraphElement | null>(null)
  // A per-mount start offset so successive waits don't always open on the same line.
  const startRef = useRef<number | null>(null)
  if (startRef.current === null) startRef.current = Math.floor(Math.random() * 997)
  const reduced = useReducedMotion()

  const list = (tips ?? []).filter((t) => t.trim())

  useRafLoop((elapsed) => {
    const el = ref.current
    if (!el || list.length === 0) return
    const start = startRef.current ?? 0
    const i = reduced
      ? start % list.length
      : (start + Math.floor(elapsed / ROTATE_MS)) % list.length
    el.textContent = list[i]
  })

  if (list.length === 0) return null

  return (
    <p
      ref={ref}
      aria-live="polite"
      // The display voice (§04 of the direction): the teacher's placard while Claude
      // works. Gentle letterspacing only — these are full sentences, not labels.
      className={cn(
        'font-display text-text-tertiary text-center text-xs leading-relaxed tracking-[0.05em]',
        className,
      )}
    >
      {list[0]}
    </p>
  )
}
