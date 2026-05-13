'use client'

import { useRef } from 'react'
import { Stage } from './Stage'
import { useRafLoop, easeInOutCubic } from '@/lib/anim'

// 5 cells, each holding one earned shape rendered as a thin ink line drawing
// over a soft watercolor wash in the shape's tone. Same viewBox 0..48 as
// the existing Shape.tsx so the geometry transfers cleanly when we swap.

const CELL = 152
const PAD = 14
const CELLS = 5
const W = CELLS * CELL + (CELLS + 1) * PAD
const H = CELL + PAD * 2 + 60 // extra room for the label beneath each cell
const CELL_Y = PAD
const SHAPE_SCALE = (CELL - 32) / 48 // shape uses 0..48 coords; leave a margin
const INK = 'var(--color-stage)'
const PENCIL = 'var(--color-text-tertiary)'

// Each shape's center within its 48-unit coordinate space.
const CENTER_48 = 24

// Phrase lengths chosen so no two shapes lock into the same rhythm.
const CIRCLE_BREATH_MS = 3600
const TRIANGLE_SNAP_MS = 1900 // 1300 hold + 600 snap, 6 steps × 60°
const TRIANGLE_HOLD_MS = 1300
const TRIANGLE_DUR_MS = TRIANGLE_SNAP_MS - TRIANGLE_HOLD_MS
const ARC_TURN_MS = 7600
const SQUARE_TILT_MS = 4600
const COMPOSITE_ORBIT_MS = 4400

type Tone = 'accent' | 'secondary' | 'tertiary' | 'stage' | 'mixed'

type ShapeCfg = {
  kind: 'circle' | 'triangle' | 'arc' | 'square' | 'composite'
  label: string
  tone: Tone
}

const SHAPES: ShapeCfg[] = [
  { kind: 'circle', label: 'CLAUDE.md authoring', tone: 'accent' },
  { kind: 'triangle', label: 'Slash command discovery', tone: 'secondary' },
  { kind: 'arc', label: 'Write a directive, not a chat', tone: 'tertiary' },
  { kind: 'square', label: 'Review before you accept', tone: 'stage' },
  { kind: 'composite', label: 'Scope to one segment', tone: 'mixed' },
]

const WASH_ID = (i: number) => `shape-wash-${i}`
const FILL_ID = (i: number) => `shape-fill-${i}`
const FILL_ALT_ID = (i: number) => `shape-fill-alt-${i}`

export function ShapesShowcase() {
  const refs = useRef<Array<SVGGElement | null>>([])
  const compRefs = useRef<{
    primary: SVGGElement | null
    secondary: SVGGElement | null
  }>({ primary: null, secondary: null })

  useRafLoop((elapsed) => {
    // Circle — gentle breath via scale around its own center.
    const breathT = (elapsed % CIRCLE_BREATH_MS) / CIRCLE_BREATH_MS
    const breath = 1 + Math.sin(breathT * Math.PI * 2) * 0.05
    refs.current[0]?.setAttribute(
      'transform',
      `translate(${CENTER_48 * (1 - breath)} ${CENTER_48 * (1 - breath)}) scale(${breath.toFixed(3)})`,
    )

    // Triangle — Schlemmer grid choreography: hold a pose, snap 60°, hold.
    const slot = elapsed % TRIANGLE_SNAP_MS
    const stepIdx = Math.floor(elapsed / TRIANGLE_SNAP_MS) % 6
    const fromAngle = stepIdx * 60
    const toAngle = (stepIdx + 1) * 60
    let triAngle: number
    if (slot >= TRIANGLE_HOLD_MS) {
      const local = (slot - TRIANGLE_HOLD_MS) / TRIANGLE_DUR_MS
      triAngle = fromAngle + easeInOutCubic(Math.min(local, 1)) * (toAngle - fromAngle)
    } else {
      triAngle = fromAngle
    }
    refs.current[1]?.setAttribute(
      'transform',
      `rotate(${triAngle.toFixed(2)} ${CENTER_48} ${CENTER_48 + 6})`,
    )

    // Arc — slow rotation around its visual center. Always reads as an arc,
    // just pointing in a different direction at any given moment.
    const arcT = (elapsed % ARC_TURN_MS) / ARC_TURN_MS
    const arcAngle = arcT * 360
    refs.current[2]?.setAttribute(
      'transform',
      `rotate(${arcAngle.toFixed(2)} ${CENTER_48} ${CENTER_48})`,
    )

    // Square — slow tilt with held positions at the extremes (sine of sine).
    const sqT = (elapsed % SQUARE_TILT_MS) / SQUARE_TILT_MS
    const wobble = Math.sin(sqT * Math.PI * 2)
    // Squaring the sign-preserved value flattens midrange, pushing the angle
    // to dwell near 0 and the extremes — gives a "considered" feel.
    const sqAngle = Math.sign(wobble) * Math.pow(Math.abs(wobble), 0.5) * 8
    refs.current[3]?.setAttribute(
      'transform',
      `rotate(${sqAngle.toFixed(2)} ${CENTER_48} ${CENTER_48})`,
    )

    // Composite — the pair turns together around their shared centroid
    // (a slow-dance turn), with a subtle inner orbit of the secondary
    // around the primary so they read as separable.
    const compT = (elapsed % COMPOSITE_ORBIT_MS) / COMPOSITE_ORBIT_MS
    const turn = compT * 360
    refs.current[4]?.setAttribute(
      'transform',
      `rotate(${turn.toFixed(2)} ${CENTER_48} ${CENTER_48})`,
    )
    // Secondary breathes slightly toward the primary — focus motif.
    const focusBreath = 1 + Math.sin(compT * Math.PI * 4) * 0.06
    compRefs.current.secondary?.setAttribute(
      'transform',
      `translate(${32 * (1 - focusBreath)} ${32 * (1 - focusBreath)}) scale(${focusBreath.toFixed(3)})`,
    )
  })

  // Tone → CSS var resolver for fills/strokes.
  const toneVar = (tone: Tone, kind: 'fill' | 'stroke' = 'fill') => {
    if (tone === 'mixed') return 'var(--color-accent)' // primary leg only
    if (tone === 'stage') return 'var(--color-stage)'
    if (tone === 'accent') return kind === 'stroke' ? 'var(--color-accent-strong)' : 'var(--color-accent)'
    if (tone === 'secondary')
      return kind === 'stroke' ? 'var(--color-secondary-strong)' : 'var(--color-secondary)'
    if (tone === 'tertiary')
      return kind === 'stroke' ? 'var(--color-tertiary-strong)' : 'var(--color-tertiary)'
    return INK
  }

  return (
    <Stage
      title="Shapes"
      caption="Five home-page icons reimagined as ink-on-paper figure studies"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Animated shape mockups">
        <defs>
          {SHAPES.map((s, i) => {
            // Wash: faint and ambient, like a hint of stage light. Echoes
            // the spinning page where each cell glows softly in its tone.
            const washColor = s.tone === 'mixed' ? 'var(--color-accent)' : toneVar(s.tone)
            // Shape fill: a linear gradient from a very light top to a
            // slightly stronger bottom — the dimensional-but-airy treatment
            // visible on the spinning page's hexagon.
            const fillColor = s.tone === 'mixed' ? 'var(--color-accent)' : toneVar(s.tone)
            const altColor = s.tone === 'mixed' ? 'var(--color-secondary)' : fillColor
            return (
              <g key={s.kind}>
                <radialGradient id={WASH_ID(i)} cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor={washColor} stopOpacity={0.13} />
                  <stop offset="60%" stopColor={washColor} stopOpacity={0.06} />
                  <stop offset="100%" stopColor={washColor} stopOpacity={0} />
                </radialGradient>
                <linearGradient id={FILL_ID(i)} x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor={fillColor} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={fillColor} stopOpacity={0.22} />
                </linearGradient>
                <linearGradient id={FILL_ALT_ID(i)} x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor={altColor} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={altColor} stopOpacity={0.22} />
                </linearGradient>
              </g>
            )
          })}
          <filter id="shape-edge" x="-3%" y="-3%" width="106%" height="106%">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" />
            <feDisplacementMap in="SourceGraphic" scale="0.4" />
          </filter>
        </defs>

        {SHAPES.map((s, i) => {
          const x = PAD + i * (CELL + PAD)
          const cellCx = x + CELL / 2
          const cellCy = CELL_Y + CELL / 2
          const shapeOriginX = cellCx - (48 * SHAPE_SCALE) / 2
          const shapeOriginY = cellCy - (48 * SHAPE_SCALE) / 2
          return (
            <g key={s.kind}>
              {/* Pencil-ruled cell */}
              <rect
                x={x}
                y={CELL_Y}
                width={CELL}
                height={CELL}
                fill="transparent"
                stroke={PENCIL}
                strokeWidth={0.5}
                strokeDasharray="2 3"
              />
              {/* Cell label — figure number, like Schlemmer's score */}
              <text
                x={x + 8}
                y={CELL_Y + 16}
                fill={PENCIL}
                className="font-mono text-[9px] uppercase tracking-widest"
              >
                fig. {i + 1}
              </text>
              {/* Watercolor wash — larger and more diffuse than the shape
                  so it reads as ambient light rather than a halo */}
              <circle cx={cellCx} cy={cellCy} r={CELL / 2 + 8} fill={`url(#${WASH_ID(i)})`} />

              {/* Shape group — placed at cell, scaled from 0..48 to fit */}
              <g
                transform={`translate(${shapeOriginX} ${shapeOriginY}) scale(${SHAPE_SCALE})`}
                filter="url(#shape-edge)"
              >
                <g ref={(el) => { refs.current[i] = el }}>
                  {s.kind === 'circle' && (
                    <circle
                      cx={CENTER_48}
                      cy={CENTER_48}
                      r={18}
                      fill={`url(#${FILL_ID(i)})`}
                      stroke={INK}
                      strokeWidth={0.55}
                    />
                  )}
                  {s.kind === 'triangle' && (
                    <polygon
                      points="24,6 44,42 4,42"
                      fill={`url(#${FILL_ID(i)})`}
                      stroke={INK}
                      strokeWidth={0.55}
                      strokeLinejoin="round"
                    />
                  )}
                  {s.kind === 'arc' && (
                    <path
                      d="M 6 36 A 18 18 0 0 1 42 36"
                      fill="none"
                      stroke={INK}
                      strokeWidth={0.7}
                      strokeLinecap="round"
                    />
                  )}
                  {s.kind === 'square' && (
                    <rect
                      x={8}
                      y={8}
                      width={32}
                      height={32}
                      fill={`url(#${FILL_ID(i)})`}
                      stroke={INK}
                      strokeWidth={0.55}
                    />
                  )}
                  {s.kind === 'composite' && (
                    <>
                      <g ref={(el) => { compRefs.current.primary = el }}>
                        <circle
                          cx={16}
                          cy={16}
                          r={10}
                          fill={`url(#${FILL_ID(i)})`}
                          stroke={INK}
                          strokeWidth={0.55}
                        />
                      </g>
                      <g ref={(el) => { compRefs.current.secondary = el }}>
                        <rect
                          x={22}
                          y={22}
                          width={20}
                          height={20}
                          fill={`url(#${FILL_ALT_ID(i)})`}
                          stroke={INK}
                          strokeWidth={0.55}
                        />
                      </g>
                    </>
                  )}
                </g>
              </g>

              {/* Capability label beneath the cell */}
              <text
                x={cellCx}
                y={CELL_Y + CELL + 22}
                textAnchor="middle"
                fill="var(--color-text-secondary)"
                className="font-serif text-[12px] italic"
              >
                {s.label}
              </text>
            </g>
          )
        })}
      </svg>
    </Stage>
  )
}
