'use client'

import { useId, useRef, useState, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import {
  easeInOutCubic,
  lerpPoints,
  pointsToString,
  useRafLoop,
} from '@/lib/anim'
import type { ShapeKind } from '@/lib/levels/types'

type AnimateMode = 'always' | 'hover' | 'never'

type ShapeProps = ComponentProps<'svg'> & {
  kind: ShapeKind
  size?: number
  earned?: boolean
  /** Animation behavior for earned shapes. Defaults to 'always'. Ignored when !earned. */
  animate?: AnimateMode
}

// Per-figure Bauhaus palette. Composite gets a partner stroke/fill for the trailing square.
const PALETTE: Record<
  ShapeKind,
  { fill: string; stroke: string; partner?: { fill: string; stroke: string } }
> = {
  circle: { fill: 'var(--color-accent)', stroke: 'var(--color-accent-strong)' },
  triangle: { fill: 'var(--color-secondary)', stroke: 'var(--color-secondary-strong)' },
  arc: { fill: 'var(--color-tertiary)', stroke: 'var(--color-tertiary-strong)' },
  square: { fill: 'var(--color-stage)', stroke: 'var(--color-stage)' },
  composite: {
    fill: 'var(--color-accent)',
    stroke: 'var(--color-accent-strong)',
    partner: { fill: 'var(--color-secondary)', stroke: 'var(--color-secondary-strong)' },
  },
}

// Motion phrase lengths chosen so no two shapes lock into the same rhythm
// (carried over from src/components/explore/ShapesShowcase.tsx).
const CIRCLE_BREATH_MS = 3600
const TRIANGLE_FRAME_MS = 1800
const TRIANGLE_HOLD_MS = 1200
const TRIANGLE_MORPH_MS = TRIANGLE_FRAME_MS - TRIANGLE_HOLD_MS
const ARC_TURN_MS = 7600
const SQUARE_TILT_MS = 4600
const COMPOSITE_ORBIT_MS = 4400

const CENTER_48 = 24

// Five plausible triangle poses; each apex-up so the figure stays recognizable
// across the phrase. Vertex order matches across rows for clean interpolation.
const TRIANGLE_TARGETS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[24, 6], [44, 42], [4, 42]],
  [[27, 8], [45, 41], [5, 43]],
  [[24, 4], [46, 42], [2, 42]],
  [[21, 8], [43, 43], [3, 41]],
  [[24, 10], [45, 40], [3, 40]],
]

export function Shape({
  kind,
  size = 48,
  earned = false,
  animate = 'always',
  className,
  ...props
}: ShapeProps) {
  const [hovered, setHovered] = useState(false)
  const shapeRef = useRef<SVGGElement | null>(null)
  const triRef = useRef<SVGPolygonElement | null>(null)
  const secondaryRef = useRef<SVGGElement | null>(null)

  // useId() is stable per render so SSR + hydration produce the same string.
  // Strip colons so the id is safe to embed in url(#...) references.
  const uid = useId().replace(/:/g, '-')
  const washId = `${uid}-wash`
  const fillId = `${uid}-fill`
  const fillAltId = `${uid}-fill-alt`
  const edgeId = `${uid}-edge`

  const isAnimating =
    earned && (animate === 'always' || (animate === 'hover' && hovered))

  useRafLoop((elapsed) => {
    if (!isAnimating) return

    switch (kind) {
      case 'circle': {
        const t = (elapsed % CIRCLE_BREATH_MS) / CIRCLE_BREATH_MS
        const breath = 1 + Math.sin(t * Math.PI * 2) * 0.05
        shapeRef.current?.setAttribute(
          'transform',
          `translate(${CENTER_48 * (1 - breath)} ${CENTER_48 * (1 - breath)}) scale(${breath.toFixed(
            3,
          )})`,
        )
        return
      }
      case 'triangle': {
        const slot = elapsed % TRIANGLE_FRAME_MS
        const idx = Math.floor(elapsed / TRIANGLE_FRAME_MS) % TRIANGLE_TARGETS.length
        const next = (idx + 1) % TRIANGLE_TARGETS.length
        let pts: ReadonlyArray<readonly [number, number]>
        if (slot >= TRIANGLE_HOLD_MS) {
          const local = (slot - TRIANGLE_HOLD_MS) / TRIANGLE_MORPH_MS
          pts = lerpPoints(
            TRIANGLE_TARGETS[idx],
            TRIANGLE_TARGETS[next],
            easeInOutCubic(Math.min(local, 1)),
          )
        } else {
          pts = TRIANGLE_TARGETS[idx]
        }
        triRef.current?.setAttribute('points', pointsToString(pts))
        return
      }
      case 'arc': {
        const t = (elapsed % ARC_TURN_MS) / ARC_TURN_MS
        shapeRef.current?.setAttribute(
          'transform',
          `rotate(${(t * 360).toFixed(2)} ${CENTER_48} ${CENTER_48})`,
        )
        return
      }
      case 'square': {
        const t = (elapsed % SQUARE_TILT_MS) / SQUARE_TILT_MS
        const wobble = Math.sin(t * Math.PI * 2)
        // Sign-preserved sqrt easing: dwells at 0 and the extremes, like a held breath.
        const angle = Math.sign(wobble) * Math.pow(Math.abs(wobble), 0.5) * 8
        shapeRef.current?.setAttribute(
          'transform',
          `rotate(${angle.toFixed(2)} ${CENTER_48} ${CENTER_48})`,
        )
        return
      }
      case 'composite': {
        const t = (elapsed % COMPOSITE_ORBIT_MS) / COMPOSITE_ORBIT_MS
        shapeRef.current?.setAttribute(
          'transform',
          `rotate(${(t * 360).toFixed(2)} ${CENTER_48} ${CENTER_48})`,
        )
        // Secondary breathes toward the primary at 2× frequency — the partner motif.
        const focus = 1 + Math.sin(t * Math.PI * 4) * 0.06
        secondaryRef.current?.setAttribute(
          'transform',
          `translate(${32 * (1 - focus)} ${32 * (1 - focus)}) scale(${focus.toFixed(3)})`,
        )
        return
      }
    }
  })

  // Locked: simple hair-thin outline, no wash, no filter, no animation.
  if (!earned) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        className={cn('shrink-0', className)}
        aria-label={`${kind} locked`}
        {...props}
      >
        {kind === 'circle' && (
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="transparent"
            stroke="var(--color-border-subtle)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {kind === 'triangle' && (
          <polygon
            points="24,6 44,42 4,42"
            fill="transparent"
            stroke="var(--color-border-subtle)"
            strokeWidth={1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {kind === 'arc' && (
          <path
            d="M 6 36 A 18 18 0 0 1 42 36"
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth={1.2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {kind === 'square' && (
          <rect
            x="8"
            y="8"
            width="32"
            height="32"
            fill="transparent"
            stroke="var(--color-border-subtle)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {kind === 'composite' && (
          <>
            <circle
              cx="16"
              cy="16"
              r="10"
              fill="transparent"
              stroke="var(--color-border-subtle)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x="22"
              y="22"
              width="20"
              height="20"
              fill="transparent"
              stroke="var(--color-border-subtle)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
    )
  }

  // Earned: ink-on-paper treatment + motion.
  const p = PALETTE[kind]
  const partner = p.partner ?? p

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn('shrink-0', className)}
      aria-label={`${kind} earned`}
      onMouseEnter={animate === 'hover' ? () => setHovered(true) : undefined}
      onMouseLeave={animate === 'hover' ? () => setHovered(false) : undefined}
      {...props}
    >
      <defs>
        <radialGradient id={washId} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={p.fill} stopOpacity={0.13} />
          <stop offset="60%" stopColor={p.fill} stopOpacity={0.06} />
          <stop offset="100%" stopColor={p.fill} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={fillId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={p.fill} stopOpacity={0.1} />
          <stop offset="100%" stopColor={p.fill} stopOpacity={0.32} />
        </linearGradient>
        <linearGradient id={fillAltId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={partner.fill} stopOpacity={0.1} />
          <stop offset="100%" stopColor={partner.fill} stopOpacity={0.32} />
        </linearGradient>
        <filter id={edgeId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" />
          <feDisplacementMap in="SourceGraphic" scale="0.5" />
        </filter>
      </defs>

      {/* Ambient wash — larger than the shape, low opacity. Not wobbled. */}
      <circle cx={CENTER_48} cy={CENTER_48} r={26} fill={`url(#${washId})`} />

      {/* Shape group — ink wobble filter applied here, not to the wash. */}
      <g filter={`url(#${edgeId})`}>
        <g ref={shapeRef}>
          {kind === 'circle' && (
            <circle
              cx={CENTER_48}
              cy={CENTER_48}
              r={18}
              fill={`url(#${fillId})`}
              stroke={p.stroke}
              strokeWidth={0.9}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {kind === 'triangle' && (
            <polygon
              ref={triRef}
              points="24,6 44,42 4,42"
              fill={`url(#${fillId})`}
              stroke={p.stroke}
              strokeWidth={0.9}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {kind === 'arc' && (
            <path
              d="M 6 36 A 18 18 0 0 1 42 36"
              fill="none"
              stroke={p.stroke}
              strokeWidth={1.2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {kind === 'square' && (
            <rect
              x={8}
              y={8}
              width={32}
              height={32}
              fill={`url(#${fillId})`}
              stroke={p.stroke}
              strokeWidth={0.9}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {kind === 'composite' && (
            <>
              <circle
                cx={16}
                cy={16}
                r={10}
                fill={`url(#${fillId})`}
                stroke={p.stroke}
                strokeWidth={0.9}
                vectorEffect="non-scaling-stroke"
              />
              <g ref={secondaryRef}>
                <rect
                  x={22}
                  y={22}
                  width={20}
                  height={20}
                  fill={`url(#${fillAltId})`}
                  stroke={partner.stroke}
                  strokeWidth={0.9}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            </>
          )}
        </g>
      </g>
    </svg>
  )
}
