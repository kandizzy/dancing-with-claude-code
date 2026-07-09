'use client'

import { useRef } from 'react'
import { easeOutCubic, useRafLoop, useReducedMotion } from '@/lib/anim'
import type { ShapeKind } from '@/lib/figures/types'

type FigureThinkingProps = {
  kind: ShapeKind
  /**
   * When true, a small dot traces the outline — "the note takes the stage," i.e. a freshly
   * pinned note being loaded into the fresh context. Shown on the grace ask and the
   * post-reload re-ask; off for a first/plain ask (rationing the staging to when it's real).
   */
  noteInPlay?: boolean
  size?: number
  className?: string
}

// Mirror Shape.tsx's stroke palette so the sketch reads as the same figure, just provisional.
const STROKE: Record<ShapeKind, string> = {
  circle: 'var(--color-accent-strong)',
  triangle: 'var(--color-secondary-strong)',
  arc: 'var(--color-tertiary-strong)',
  square: 'var(--color-stage)',
  composite: 'var(--color-accent-strong)',
}

const DRAW_MS = 700 // outline draws itself on
const BREATH_MS = 3000 // gentle scale pulse while Claude genuinely works
const TRACE_MS = 2600 // note-dot's trip around the outline
const CENTER = 24

/**
 * The "thinking" visualization that fills the dead air while Claude works, in the figure's own
 * shape. It is deliberately *provisional* — a thin, unfilled sketch that draws itself on and
 * breathes. It never inks or fills here, so it can't imply the shape is earned; that payoff is
 * the solid Shape in the award card. Indeterminate by design: it breathes on a loop and only
 * stops when the real reply arrives and this unmounts (never on a timer).
 *
 * Shape-agnostic: the outline draws on via a normalized `pathLength={1}` dash, and the note-dot
 * rides the real outline via getPointAtLength — so the same component works for any figure's
 * shape if other figures adopt FigureChat.
 */
export function FigureThinking({ kind, noteInPlay = false, size = 140, className }: FigureThinkingProps) {
  const groupRef = useRef<SVGGElement | null>(null)
  const outlineRef = useRef<SVGGeometryElement | null>(null)
  const dotRef = useRef<SVGCircleElement | null>(null)
  const reduced = useReducedMotion()

  useRafLoop((elapsed) => {
    const outline = outlineRef.current
    if (!outline) return

    // Reduced motion: useRafLoop fires this once with elapsed=0. Render the finished sketch,
    // fully drawn and still — no draw-on, no breathing, no tracing.
    if (reduced) {
      outline.setAttribute('stroke-dashoffset', '0')
      groupRef.current?.removeAttribute('transform')
      if (dotRef.current) dotRef.current.style.opacity = '0'
      return
    }

    // 1) Draw the outline on.
    const drawn = easeOutCubic(Math.min(elapsed / DRAW_MS, 1))
    outline.setAttribute('stroke-dashoffset', String(1 - drawn))

    // 2) Once drawn, breathe — calm, indeterminate "still working."
    if (drawn >= 1) {
      const b = (elapsed % BREATH_MS) / BREATH_MS
      const s = 1 + Math.sin(b * Math.PI * 2) * 0.035
      groupRef.current?.setAttribute(
        'transform',
        `translate(${(CENTER * (1 - s)).toFixed(3)} ${(CENTER * (1 - s)).toFixed(3)}) scale(${s.toFixed(3)})`,
      )

      // 3) The note takes the stage: a dot rides the outline while the note loads.
      const dot = dotRef.current
      if (noteInPlay && dot) {
        try {
          const total = outline.getTotalLength()
          const frac = (elapsed % TRACE_MS) / TRACE_MS
          const pt = outline.getPointAtLength(frac * total)
          dot.setAttribute('cx', pt.x.toFixed(2))
          dot.setAttribute('cy', pt.y.toFixed(2))
          dot.style.opacity = '1'
        } catch {
          // getPointAtLength unsupported for this element in this browser — skip the dot.
        }
      }
    }
  })

  const stroke = STROKE[kind]
  // Callback ref: stores whichever geometry element renders into the shared outline ref.
  const setOutline = (el: SVGGeometryElement | null) => {
    outlineRef.current = el
  }
  // Shared sketch-stroke props. pathLength={1} normalizes every shape's length to 1 so the
  // dash draw-on is identical regardless of geometry; start hidden (offset 1) when animating.
  const sketch = {
    ref: setOutline,
    fill: 'none' as const,
    stroke,
    strokeWidth: 1.1,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: reduced ? 0 : 1,
    vectorEffect: 'non-scaling-stroke' as const,
    opacity: 0.6,
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={`${kind} taking shape while Claude works`}
    >
      <g ref={groupRef}>
        {kind === 'circle' && <circle cx={CENTER} cy={CENTER} r={18} {...sketch} />}
        {kind === 'triangle' && <polygon points="24,6 44,42 4,42" {...sketch} />}
        {kind === 'arc' && <path d="M 6 36 A 18 18 0 0 1 42 36" {...sketch} />}
        {kind === 'square' && <rect x={8} y={8} width={32} height={32} {...sketch} />}
        {/* Composite mirrors Shape.tsx's circle+square as ONE compound path so the shared
            pathLength dash draw-on and getPointAtLength dot keep working (they need a single
            SVGGeometryElement). The subshapes sketch on in sequence — circle, then square. */}
        {kind === 'composite' && (
          <path d="M 26 16 A 10 10 0 1 1 6 16 A 10 10 0 1 1 26 16 M 22 22 h 20 v 20 h -20 Z" {...sketch} />
        )}

        {noteInPlay && (
          <circle ref={dotRef} r={2.2} fill={stroke} style={{ opacity: 0 }} aria-hidden />
        )}
      </g>
    </svg>
  )
}
