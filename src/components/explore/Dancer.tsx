'use client'

import { useRef } from 'react'
import { Stage } from './Stage'
import { useRafLoop, easeInOutCubic } from '@/lib/anim'

const W = 240
const H = 320
const FLOOR = 300
const SPINE_X = 120

// Phrase lengths are chosen so the figure's four motions never line up
// rhythmically — feels alive rather than mechanical.
const BODY_SWAY_MS = 5200 // whole figure rocks at the floor
const SKIRT_SWAY_MS = 2600 // skirt counter-sways at the waist
const HEAD_WOBBLE_MS = 1800
const HOOP_SPIN_MS = 2400 // simulated 3D rotation via scaleX
const PROP_ORBIT_MS = 3800 // composite prop orbits the hand

export function Dancer() {
  const bodyRef = useRef<SVGGElement | null>(null)
  const skirtRef = useRef<SVGGElement | null>(null)
  const headRef = useRef<SVGGElement | null>(null)
  const hoopRef = useRef<SVGGElement | null>(null)
  const propRef = useRef<SVGGElement | null>(null)

  useRafLoop((elapsed) => {
    // Whole figure: gentle pendulum at the floor (anchor = feet). easeInOutCubic
    // around a sine wave keeps the endpoints smooth.
    const bodyT = (elapsed % BODY_SWAY_MS) / BODY_SWAY_MS
    const bodyAngle = Math.sin(bodyT * Math.PI * 2) * 3.5
    if (bodyRef.current) {
      bodyRef.current.setAttribute(
        'transform',
        `rotate(${bodyAngle.toFixed(2)} ${SPINE_X} ${FLOOR})`,
      )
    }

    // Skirt: counter-sway at the waist apex. Slightly larger angle so it
    // reads as the skirt swinging against the body.
    const skirtT = (elapsed % SKIRT_SWAY_MS) / SKIRT_SWAY_MS
    const skirtAngle = -Math.sin(skirtT * Math.PI * 2) * 5.5
    if (skirtRef.current) {
      skirtRef.current.setAttribute(
        'transform',
        `rotate(${skirtAngle.toFixed(2)} ${SPINE_X} 220)`,
      )
    }

    // Head: small wobble around its center — alive but not nervous.
    const headT = (elapsed % HEAD_WOBBLE_MS) / HEAD_WOBBLE_MS
    const headAngle = Math.sin(headT * Math.PI * 2) * 8
    if (headRef.current) {
      headRef.current.setAttribute(
        'transform',
        `rotate(${headAngle.toFixed(2)} ${SPINE_X} 130)`,
      )
    }

    // Hoop: simulated 3D spin around the vertical axis by oscillating scaleX
    // through 0. When scaleX < 0 the hoop appears flipped — same trick a
    // paper disc plays when you rotate it edge-on past 90°.
    const hoopT = (elapsed % HOOP_SPIN_MS) / HOOP_SPIN_MS
    const sx = Math.cos(hoopT * Math.PI * 2)
    if (hoopRef.current) {
      // Scale around the hoop's center, not the SVG origin.
      hoopRef.current.setAttribute(
        'transform',
        `translate(${SPINE_X} 95) scale(${sx.toFixed(3)} 1) translate(${-SPINE_X} -95)`,
      )
    }

    // Prop: composite (red disk + blue square pair) orbits the dancer's hand.
    // Uses easeInOutCubic on each quarter so the prop hangs at top/bottom —
    // a Schlemmer grid-pose feel rather than constant velocity.
    const propT = (elapsed % PROP_ORBIT_MS) / PROP_ORBIT_MS
    // Stepped progress: 4 held positions per cycle with smooth transitions
    // between them. Hand sits at (180, 180); orbit radius 18.
    const STEPS = 4
    const stepT = propT * STEPS
    const stepIdx = Math.floor(stepT)
    const local = stepT - stepIdx
    const eased = easeInOutCubic(local)
    const startAngle = (stepIdx / STEPS) * Math.PI * 2
    const endAngle = ((stepIdx + 1) / STEPS) * Math.PI * 2
    const orbitAngle = startAngle + eased * (endAngle - startAngle)
    const handX = 180
    const handY = 180
    const orbitR = 16
    const px = handX + orbitR * Math.cos(orbitAngle)
    const py = handY + orbitR * Math.sin(orbitAngle)
    if (propRef.current) {
      propRef.current.setAttribute('transform', `translate(${(px - handX).toFixed(2)} ${(py - handY).toFixed(2)})`)
    }
  })

  return (
    <Stage
      title="Dancer"
      caption="Skirt · Torso · Head · Hoop · Prop — four phrase lengths, no rhythm match"
      grid
    >
      <div className="flex items-center justify-center p-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[360px] w-auto"
          role="img"
          aria-label="A Schlemmer-style geometric dancer assembled from the prototype's earned shapes"
        >
          {/* Floor reference line — like Schlemmer's stage grid */}
          <line
            x1={20}
            x2={W - 20}
            y1={FLOOR}
            y2={FLOOR}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
          />

          <g ref={bodyRef}>
            {/* Skirt — triangle inverted-pyramid shape, base at floor, apex at waist */}
            <g ref={skirtRef}>
              <polygon
                points={`${SPINE_X},220 ${SPINE_X + 60},${FLOOR} ${SPINE_X - 60},${FLOOR}`}
                fill="var(--color-secondary)"
                stroke="var(--color-secondary-strong)"
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {/* Vertical stripes — Schlemmer's barrel/skirt pattern */}
              {[-30, -10, 10, 30].map((dx) => {
                // Stripes fan out toward the floor: each stripe goes from waist
                // (apex) to a floor offset matching its lateral position.
                return (
                  <line
                    key={dx}
                    x1={SPINE_X}
                    x2={SPINE_X + dx * 2}
                    y1={222}
                    y2={FLOOR - 2}
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth={1}
                  />
                )
              })}
            </g>

            {/* Torso — square, sits on skirt apex */}
            <rect
              x={SPINE_X - 25}
              y={160}
              width={50}
              height={60}
              fill="var(--color-stage)"
              stroke="var(--color-paper)"
              strokeWidth={2}
            />
            {/* Horizontal stripes on torso */}
            {[170, 180, 190, 200, 210].map((y) => (
              <line
                key={y}
                x1={SPINE_X - 25}
                x2={SPINE_X + 25}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.22)"
                strokeWidth={1}
              />
            ))}

            {/* Head — circle with reflective highlight, perched on torso */}
            <g ref={headRef}>
              <circle
                cx={SPINE_X}
                cy={130}
                r={24}
                fill="var(--color-accent)"
                stroke="var(--color-accent-strong)"
                strokeWidth={2}
              />
              <ellipse cx={SPINE_X - 8} cy={122} rx={6} ry={3} fill="rgba(255,255,255,0.4)" />
            </g>

            {/* Hoop — arc held above head, spins around vertical axis via scaleX */}
            <g ref={hoopRef}>
              <path
                d={`M ${SPINE_X - 40} 95 A 40 12 0 0 1 ${SPINE_X + 40} 95`}
                fill="none"
                stroke="var(--color-tertiary)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* Mirror the lower half so the hoop reads as a full ring when scaleX = 1 */}
              <path
                d={`M ${SPINE_X - 40} 95 A 40 12 0 0 0 ${SPINE_X + 40} 95`}
                fill="none"
                stroke="var(--color-tertiary)"
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.45}
              />
            </g>

            {/* Prop — composite (paired disk + square), orbiting the right hand */}
            <g ref={propRef}>
              <circle
                cx={180}
                cy={180}
                r={8}
                fill="var(--color-accent)"
                stroke="var(--color-accent-strong)"
                strokeWidth={1.5}
              />
              <rect
                x={184}
                y={184}
                width={12}
                height={12}
                fill="var(--color-secondary)"
                stroke="var(--color-secondary-strong)"
                strokeWidth={1.5}
              />
            </g>
          </g>
        </svg>
      </div>
    </Stage>
  )
}
