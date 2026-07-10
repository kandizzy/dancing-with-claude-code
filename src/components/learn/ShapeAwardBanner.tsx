'use client'

import { useEffect, useRef } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { Shape } from './Shape'
import { easeOutCubic, useReducedMotion } from '@/lib/anim'
import type { FigureId, ShapeKind } from '@/lib/figures/types'

type Props = {
  figureId: FigureId
  kind: ShapeKind
  shapeLabel: string
  copy: string
}

const ENTRANCE_MS = 450

// Per-figure earn colors (design direction §02, decided): the earn moment wears the
// figure's own primary. Red keeps only its app-wide CLAUDE.md-lineage jobs elsewhere.
// Composite's border is the square's blue — with the red circle in the Shape beside it,
// the banner is the one surface where two primaries meet.
const EARN_COLORS: Record<ShapeKind, { border: string; wash: string }> = {
  circle: { border: '--color-accent-strong', wash: '--color-accent' },
  triangle: { border: '--color-secondary-strong', wash: '--color-secondary' },
  arc: { border: '--color-tertiary-strong', wash: '--color-tertiary' },
  square: { border: '--color-stage', wash: '--color-stage' },
  composite: { border: '--color-secondary-strong', wash: '--color-secondary' },
}

/**
 * The one earned-moment treatment, shared by all five figures. Persist-forever
 * (earned is earned), but the *earning* visit celebrates: if completion flips
 * false→true while mounted, the banner enters with a one-shot rise and the
 * shape dances continuously; on a revisit it sits quiet and only dances on hover.
 */
export function ShapeAwardBanner({ figureId, kind, shapeLabel, copy }: Props) {
  const { isCompleted } = useLearnStore()
  const completed = isCompleted(figureId)
  // Captured once at mount: was this figure already earned when the page opened?
  const wasEarnedAtMount = useRef(completed)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const reduced = useReducedMotion()
  const justEarned = completed && !wasEarnedAtMount.current

  // One-shot entrance (not useRafLoop — that runs for the component's lifetime,
  // and this banner persists long after the entrance is over).
  useEffect(() => {
    const el = cardRef.current
    if (!el || !justEarned || reduced) return
    let raf = 0
    const start = performance.now()
    const tick = () => {
      const t = easeOutCubic(Math.min((performance.now() - start) / ENTRANCE_MS, 1))
      el.style.opacity = String(t)
      el.style.transform = `translateY(${((1 - t) * 8).toFixed(2)}px)`
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        el.style.opacity = ''
        el.style.transform = ''
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [justEarned, reduced])

  if (!completed) return null
  const earn = EARN_COLORS[kind]
  return (
    <div
      ref={cardRef}
      style={{
        ...(justEarned && !reduced ? { opacity: 0 } : undefined),
        borderColor: `var(${earn.border})`,
        backgroundColor: `color-mix(in srgb, var(${earn.wash}) 5%, transparent)`,
      }}
      className="rounded-md border p-4 text-sm"
    >
      <div className="text-text-primary mb-1 flex items-center gap-2 font-semibold">
        <Shape kind={kind} size={24} earned animate={justEarned ? 'always' : 'hover'} />
        {shapeLabel} earned
      </div>
      <p className="text-text-secondary m-0">{copy}</p>
    </div>
  )
}
