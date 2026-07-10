'use client'

import { useRef } from 'react'
import { easeOutCubic, useRafLoop, useReducedMotion } from '@/lib/anim'
import type { ShapeKind } from '@/lib/figures/types'

type FigureThinkingProps = {
  kind: ShapeKind
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
const TRACE_MS = 2600 // trace dot's trip around the outline
const TRACE_2_MS = 3400 // the composite square's dot — near-prime vs the circle's lap
const SQUARE_DELAY_MS = 350 // composite square joins the draw a beat behind the circle
const CENTER = 24

/**
 * The "thinking" visualization that fills the dead air while Claude works, in the figure's own
 * shape. Deliberately *provisional* — a thin, unfilled sketch that draws itself on and
 * breathes. It never inks or fills here, so it can't imply the shape is earned; that payoff is
 * the solid Shape in the award card. Indeterminate by design: it breathes on a loop and only
 * stops when the real reply arrives and this unmounts (never on a timer).
 *
 * Per the design direction (decided): every figure's wait traces its own shape — a dot rides
 * the outline meaning "your request is driving this work." The composite runs the two-dancers
 * variant: separate circle and square outlines, one dot each, lapping at near-prime tempos so
 * the parts drift in and out of phase (and the only surface where two primaries meet).
 *
 * Shape-agnostic: outlines draw on via a normalized `pathLength={1}` dash, and dots ride the
 * real geometry via getPointAtLength.
 */
export function FigureThinking({ kind, size = 120, className }: FigureThinkingProps) {
  const groupRef = useRef<SVGGElement | null>(null)
  const outlineRef = useRef<SVGGeometryElement | null>(null)
  const dotRef = useRef<SVGCircleElement | null>(null)
  // Two-dancers refs (composite only).
  const squareRef = useRef<SVGGeometryElement | null>(null)
  const squareDotRef = useRef<SVGCircleElement | null>(null)
  const reduced = useReducedMotion()
  const isComposite = kind === 'composite'

  useRafLoop((elapsed) => {
    const outline = outlineRef.current
    if (!outline) return

    // Reduced motion: useRafLoop fires this once with elapsed=0. Render the finished sketch,
    // fully drawn and still — no draw-on, no breathing, dots resting at their path starts.
    if (reduced) {
      outline.setAttribute('stroke-dashoffset', '0')
      squareRef.current?.setAttribute('stroke-dashoffset', '0')
      groupRef.current?.removeAttribute('transform')
      restDot(dotRef.current, outline)
      restDot(squareDotRef.current, squareRef.current)
      return
    }

    // 1) Draw the outline(s) on. The composite assembles parts-then-whole: the square
    //    joins a beat after the circle.
    const drawn = easeOutCubic(Math.min(elapsed / DRAW_MS, 1))
    outline.setAttribute('stroke-dashoffset', String(1 - drawn))
    let allDrawn = drawn >= 1
    if (isComposite && squareRef.current) {
      const drawnSq = easeOutCubic(Math.min(Math.max(elapsed - SQUARE_DELAY_MS, 0) / DRAW_MS, 1))
      squareRef.current.setAttribute('stroke-dashoffset', String(1 - drawnSq))
      allDrawn = allDrawn && drawnSq >= 1
    }

    // 2) Once drawn, breathe — calm, indeterminate "still working." The group carries the
    //    breathe so outlines and dots move together.
    if (allDrawn) {
      const b = (elapsed % BREATH_MS) / BREATH_MS
      const s = 1 + Math.sin(b * Math.PI * 2) * 0.035
      groupRef.current?.setAttribute(
        'transform',
        `translate(${(CENTER * (1 - s)).toFixed(3)} ${(CENTER * (1 - s)).toFixed(3)}) scale(${s.toFixed(3)})`,
      )

      // 3) Trace: your request driving the work — a dot rides each outline.
      rideDot(dotRef.current, outline, elapsed, TRACE_MS)
      if (isComposite) rideDot(squareDotRef.current, squareRef.current, elapsed, TRACE_2_MS)
    }
  })

  const stroke = STROKE[kind]
  const setOutline = (el: SVGGeometryElement | null) => {
    outlineRef.current = el
  }
  const setSquare = (el: SVGGeometryElement | null) => {
    squareRef.current = el
  }
  // Shared sketch-stroke props. pathLength={1} normalizes every shape's length to 1 so the
  // dash draw-on is identical regardless of geometry; start hidden (offset 1) when animating.
  // NO vector-effect: non-scaling-stroke makes Chrome compute the dash pattern in screen
  // pixels, silently breaking the pathLength normalization. Width is user units — bolder
  // per the direction: the sketch is the signature wait, not a footnote.
  const sketch = {
    fill: 'none' as const,
    stroke,
    strokeWidth: 0.85,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: reduced ? 0 : 1,
    opacity: 0.75,
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
        {kind === 'circle' && <circle ref={setOutline} cx={CENTER} cy={CENTER} r={18} {...sketch} />}
        {kind === 'triangle' && <polygon ref={setOutline} points="24,6 44,42 4,42" {...sketch} />}
        {kind === 'arc' && <path ref={setOutline} d="M 6 36 A 18 18 0 0 1 42 36" {...sketch} />}
        {kind === 'square' && <rect ref={setOutline} x={8} y={8} width={32} height={32} {...sketch} />}
        {isComposite && (
          <>
            <circle ref={setOutline} cx={16} cy={16} r={10} {...sketch} />
            <rect
              ref={setSquare}
              x={22}
              y={22}
              width={20}
              height={20}
              {...sketch}
              stroke="var(--color-secondary-strong)"
            />
            <circle
              ref={squareDotRef}
              r={2.2}
              fill="var(--color-secondary-strong)"
              style={{ opacity: 0 }}
              aria-hidden
            />
          </>
        )}
        <circle ref={dotRef} r={2.2} fill={stroke} style={{ opacity: 0 }} aria-hidden />
      </g>
    </svg>
  )
}

// Place a dot at `frac`-around-the-outline for the current lap. Guarded: getPointAtLength
// can throw for some elements in some browsers — the dot just stays hidden.
function rideDot(
  dot: SVGCircleElement | null,
  outline: SVGGeometryElement | null,
  elapsed: number,
  lapMs: number,
) {
  if (!dot || !outline) return
  try {
    const total = outline.getTotalLength()
    const frac = (elapsed % lapMs) / lapMs
    const pt = outline.getPointAtLength(frac * total)
    dot.setAttribute('cx', pt.x.toFixed(2))
    dot.setAttribute('cy', pt.y.toFixed(2))
    dot.style.opacity = '1'
  } catch {
    // unsupported — skip the dot
  }
}

// Reduced-motion resting state: dot visible, parked at the outline's start.
function restDot(dot: SVGCircleElement | null, outline: SVGGeometryElement | null) {
  if (!dot || !outline) return
  try {
    const pt = outline.getPointAtLength(0)
    dot.setAttribute('cx', pt.x.toFixed(2))
    dot.setAttribute('cy', pt.y.toFixed(2))
    dot.style.opacity = '1'
  } catch {
    // unsupported — skip the dot
  }
}
