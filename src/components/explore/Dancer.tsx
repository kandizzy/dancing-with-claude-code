'use client'

import { useEffect, useRef } from 'react'
import { Stage } from './Stage'
import { useReducedMotion } from '@/lib/anim'
import { DANCER_POSE } from './dancer-pose'

// ============================================================================
// Schlemmer-key marionette. Strictly the five earned shapes (circle, square,
// composite, arc, triangle), matching the Shapes tab's geometry, gradient,
// ink stroke, and edge filter.
//
// The dancer's POSE — the specific coordinates of every shape — lives in
// `dancer-pose.ts`. This file owns the *rendering* of those shapes: gradients,
// filters, spotlight wash, ambient motion, the surrounding Stage.
//
// Motion approach: every body part oscillates around its own natural pivot
// at a slightly different period and phase. There's no whole-body bob — the
// figure stays planted and what reads as "alive" is the small uncoordinated
// drifts of each part. Schlemmer's figures were marionettes; this is the
// strings.
// ============================================================================

const W = 360
const H = 460
const SPINE_X = 180
const INK = 'var(--color-stage)'

// Floor line. Set well below the deepest leg-swing position so the toe
// doesn't slice through it as the legs oscillate around their hips.
const FLOOR = 385

// Per-part oscillation. Each part has its own period (ms) and amplitude
// (degrees of rotation). Periods are deliberately near-prime numbers so the
// parts never realign into a stiff in-sync wobble.
const HEAD_OSC_MS = 5400
const HEAD_OSC_AMP = 2.0

const TORSO_OSC_MS = 6700
const TORSO_OSC_AMP = 1.0

const LEFT_LEG_OSC_MS = 4900
const LEFT_LEG_OSC_AMP = 2.5

const RIGHT_LEG_OSC_MS = 5300
const RIGHT_LEG_OSC_AMP = 2.2

const LEFT_ARM_OSC_MS = 4300
const LEFT_ARM_OSC_AMP = 3.0

const RIGHT_ARM_OSC_MS = 5700
const RIGHT_ARM_OSC_AMP = 2.5

const SKIRT_SHIMMER_MS = 5200
const SKIRT_SHIMMER_AMP = 3.5

const SPOTLIGHT_PULSE_MS = 6400
const SPOTLIGHT_PULSE_AMP = 0.08

// `bare` renders only the dancer SVG, no Stage card / title / caption — for the
// figure-5 send-off, which supplies its own surrounding copy. `svgClassName` overrides
// the default fixed height so callers can size the figure to their layout.
export function Dancer({
  bare = false,
  svgClassName,
}: {
  bare?: boolean
  svgClassName?: string
} = {}) {
  const spotlightRef = useRef<SVGCircleElement | null>(null)
  const headRef = useRef<SVGGElement | null>(null)
  const torsoRef = useRef<SVGGElement | null>(null)
  const leftLegRef = useRef<SVGGElement | null>(null)
  const rightLegRef = useRef<SVGGElement | null>(null)
  const leftArmRef = useRef<SVGGElement | null>(null)
  const rightArmRef = useRef<SVGGElement | null>(null)
  const skirtArcRefs = useRef<Array<SVGGElement | null>>([])
  const reduced = useReducedMotion()

  // Deliberately a raw rAF loop, NOT useRafLoop: that hook's reduced-motion
  // contract is "fire once and freeze," while the dancer keeps moving at 0.3×
  // amplitude (see ampScale below). Don't migrate this without changing that.
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    // Scale all amplitudes down (not off) under reduced motion. Tiny ambient
    // motion is still appropriate at the magnitudes we're using.
    const ampScale = reduced ? 0.3 : 1

    // Each part rotates around its own natural pivot. Pivots are derived from
    // the pose's geometry: head around the bottom of the head (~neck point),
    // torso around its top-edge midpoint, legs around the top-edge midpoint
    // of each leg's triangle (the hip), arms around the torso-side midpoint
    // of each arm composite's bounding box (the shoulder).
    const headPivot = {
      x: DANCER_POSE.head.center.x,
      y: DANCER_POSE.head.center.y + DANCER_POSE.head.radius,
    }
    const torsoPivot = {
      x: (DANCER_POSE.torso.vertices[0].x + DANCER_POSE.torso.vertices[1].x) / 2,
      y: (DANCER_POSE.torso.vertices[0].y + DANCER_POSE.torso.vertices[1].y) / 2,
    }
    // Leg pivots: midpoint of the top edge (top-left + top-right) / 2.
    const leftLegPivot = {
      x: (DANCER_POSE.leftLeg.vertices[0].x + DANCER_POSE.leftLeg.vertices[1].x) / 2,
      y: (DANCER_POSE.leftLeg.vertices[0].y + DANCER_POSE.leftLeg.vertices[1].y) / 2,
    }
    const rightLegPivot = {
      x: (DANCER_POSE.rightLeg.vertices[0].x + DANCER_POSE.rightLeg.vertices[1].x) / 2,
      y: (DANCER_POSE.rightLeg.vertices[0].y + DANCER_POSE.rightLeg.vertices[1].y) / 2,
    }
    // Arm pivots: the inner-torso-side midpoint of the forearm square (the
    // approximate shoulder attachment).
    const leftArmPivot = {
      x: Math.max(...DANCER_POSE.leftArm.square.vertices.map((v) => v.x)),
      y:
        DANCER_POSE.leftArm.square.vertices.reduce((sum, v) => sum + v.y, 0) /
        DANCER_POSE.leftArm.square.vertices.length,
    }
    const rightArmPivot = {
      x: Math.min(...DANCER_POSE.rightArm.square.vertices.map((v) => v.x)),
      y:
        DANCER_POSE.rightArm.square.vertices.reduce((sum, v) => sum + v.y, 0) /
        DANCER_POSE.rightArm.square.vertices.length,
    }

    // Helper: build a `rotate(angle cx cy)` transform string.
    const rot = (angle: number, p: { x: number; y: number }): string =>
      `rotate(${angle.toFixed(2)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`

    // Helper: oscillate at a period+amplitude with optional phase offset.
    const osc = (elapsed: number, period: number, amp: number, phase = 0): number =>
      Math.sin(((elapsed % period) / period + phase) * Math.PI * 2) * amp * ampScale

    const tick = () => {
      const elapsed = performance.now() - start

      // Spotlight pulse.
      const sT = (elapsed % SPOTLIGHT_PULSE_MS) / SPOTLIGHT_PULSE_MS
      if (spotlightRef.current) {
        spotlightRef.current.setAttribute(
          'r',
          (150 * (1 + Math.sin(sT * Math.PI * 2) * SPOTLIGHT_PULSE_AMP * ampScale)).toFixed(2),
        )
      }

      // Per-part rotations. Distinct periods + phase offsets so they never
      // line up.
      headRef.current?.setAttribute(
        'transform',
        rot(osc(elapsed, HEAD_OSC_MS, HEAD_OSC_AMP), headPivot),
      )
      torsoRef.current?.setAttribute(
        'transform',
        rot(osc(elapsed, TORSO_OSC_MS, TORSO_OSC_AMP, 0.3), torsoPivot),
      )
      leftLegRef.current?.setAttribute(
        'transform',
        rot(osc(elapsed, LEFT_LEG_OSC_MS, LEFT_LEG_OSC_AMP, 0.1), leftLegPivot),
      )
      rightLegRef.current?.setAttribute(
        'transform',
        // Negative amplitude so the legs counter-sway (slight contrapposto).
        rot(osc(elapsed, RIGHT_LEG_OSC_MS, -RIGHT_LEG_OSC_AMP, 0.4), rightLegPivot),
      )
      leftArmRef.current?.setAttribute(
        'transform',
        rot(osc(elapsed, LEFT_ARM_OSC_MS, LEFT_ARM_OSC_AMP, 0.2), leftArmPivot),
      )
      rightArmRef.current?.setAttribute(
        'transform',
        rot(osc(elapsed, RIGHT_ARM_OSC_MS, -RIGHT_ARM_OSC_AMP, 0.6), rightArmPivot),
      )

      // Skirt arc shimmer (per-arc, around each arc's own center).
      const baseT = (elapsed % SKIRT_SHIMMER_MS) / SKIRT_SHIMMER_MS
      skirtArcRefs.current.forEach((el, i) => {
        if (!el) return
        const arc = DANCER_POSE.skirtArcs[i]
        const angle =
          Math.sin((baseT + i * 0.25) * Math.PI * 2) * SKIRT_SHIMMER_AMP * ampScale
        el.setAttribute('transform', rot(angle, arc.center))
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const { head, torso, leftLeg, rightLeg, leftArm, rightArm, skirtArcs } =
    DANCER_POSE

  const svg = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={svgClassName ?? 'h-[540px] w-auto'}
      role="img"
      aria-label="A Schlemmer-style marionette composed of the five earned shapes from the Shapes tab"
    >
          <defs>
            <radialGradient id="spotlight-wash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
              <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="dancer-head-fill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.22} />
            </linearGradient>
            <linearGradient id="dancer-torso-fill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--color-stage)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--color-stage)" stopOpacity={0.22} />
            </linearGradient>
            <linearGradient id="dancer-arm-circle-fill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.22} />
            </linearGradient>
            <linearGradient id="dancer-arm-square-fill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0.22} />
            </linearGradient>
            <linearGradient id="dancer-leg-fill" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0.22} />
            </linearGradient>
            <radialGradient id="dancer-skirt-tile-wash" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity={0.32} />
              <stop offset="60%" stopColor="var(--color-tertiary)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity={0} />
            </radialGradient>
            <filter id="dancer-edge" x="-3%" y="-3%" width="106%" height="106%">
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" />
              <feDisplacementMap in="SourceGraphic" scale="0.4" />
            </filter>
          </defs>

          <circle
            ref={spotlightRef}
            cx={SPINE_X}
            cy={180}
            r={150}
            fill="url(#spotlight-wash)"
          />

          {/* Floor line stays still — gives the figure something to oscillate against. */}
          <line
            x1={32}
            x2={W - 32}
            y1={FLOOR}
            y2={FLOOR}
            stroke="var(--color-text-tertiary)"
            strokeWidth={0.5}
          />

          {/* LEFT LEG — wrapped in its own <g> for independent rotation. */}
          <g ref={leftLegRef}>
            <g filter="url(#dancer-edge)">
              <polygon
                points={leftLeg.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
                fill="url(#dancer-leg-fill)"
                stroke={INK}
                strokeWidth={0.7}
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* RIGHT LEG */}
          <g ref={rightLegRef}>
            <g filter="url(#dancer-edge)">
              <polygon
                points={rightLeg.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
                fill="url(#dancer-leg-fill)"
                stroke={INK}
                strokeWidth={0.7}
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* SKIRT — yellow wash + four shimmering arcs */}
          <g>
            <ellipse
              cx={SPINE_X}
              cy={252}
              rx={120 / 2 + 6}
              ry={96 * 0.45}
              fill="url(#dancer-skirt-tile-wash)"
            />
            <g filter="url(#dancer-edge)">
              {skirtArcs.map((arc, i) => {
                const startRad = (arc.startAngle * Math.PI) / 180
                const endRad = (arc.endAngle * Math.PI) / 180
                const startX = arc.center.x + arc.radius * Math.cos(startRad)
                const startY = arc.center.y + arc.radius * Math.sin(startRad)
                const endX = arc.center.x + arc.radius * Math.cos(endRad)
                const endY = arc.center.y + arc.radius * Math.sin(endRad)
                const angleSpan = Math.abs(arc.endAngle - arc.startAngle)
                const largeArc = angleSpan > 180 ? 1 : 0
                const sweep = arc.endAngle > arc.startAngle ? 1 : 0
                const d = `M ${startX} ${startY} A ${arc.radius} ${arc.radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`
                return (
                  <g
                    key={i}
                    ref={(el) => {
                      skirtArcRefs.current[i] = el
                    }}
                  >
                    <path
                      d={d}
                      fill="none"
                      stroke={INK}
                      strokeWidth={1.0}
                      strokeLinecap="round"
                    />
                  </g>
                )
              })}
            </g>
          </g>

          {/* TORSO */}
          <g ref={torsoRef}>
            <g filter="url(#dancer-edge)">
              <polygon
                points={torso.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
                fill="url(#dancer-torso-fill)"
                stroke={INK}
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* RIGHT ARM — composite */}
          <g ref={rightArmRef}>
            <g filter="url(#dancer-edge)">
              <circle
                cx={rightArm.circle.center.x}
                cy={rightArm.circle.center.y}
                r={rightArm.circle.radius}
                fill="url(#dancer-arm-circle-fill)"
                stroke={INK}
                strokeWidth={0.55}
              />
              <polygon
                points={rightArm.square.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
                fill="url(#dancer-arm-square-fill)"
                stroke={INK}
                strokeWidth={0.55}
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* LEFT ARM — composite */}
          <g ref={leftArmRef}>
            <g filter="url(#dancer-edge)">
              <circle
                cx={leftArm.circle.center.x}
                cy={leftArm.circle.center.y}
                r={leftArm.circle.radius}
                fill="url(#dancer-arm-circle-fill)"
                stroke={INK}
                strokeWidth={0.55}
              />
              <polygon
                points={leftArm.square.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
                fill="url(#dancer-arm-square-fill)"
                stroke={INK}
                strokeWidth={0.55}
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* HEAD */}
          <g ref={headRef}>
            <g filter="url(#dancer-edge)">
              <circle
                cx={head.center.x}
                cy={head.center.y}
                r={head.radius}
                fill="url(#dancer-head-fill)"
                stroke={INK}
                strokeWidth={0.9}
              />
            </g>
          </g>
    </svg>
  )

  if (bare) return svg

  return (
    <Stage
      title="A dancer"
      caption="An exploration of the basic elements of theatrical creation and design"
    >
      <div className="flex items-center justify-center">{svg}</div>
    </Stage>
  )
}
