'use client'

import { useRef } from 'react'
import { Stage } from './Stage'
import { useRafLoop, easeInOutCubic } from '@/lib/anim'

const W = 240
const H = 340
const FLOOR = 308
const SPINE_X = 120
const WAIST_Y = 218
const SHOULDER_Y = 168
const HEAD_Y = 124

// Phrase lengths chosen so the figure's four motions never line up
// rhythmically — feels alive rather than mechanical.
const BODY_SWAY_MS = 5200
const SKIRT_SWAY_MS = 2600
const HEAD_WOBBLE_MS = 1800
const HOOP_SPIN_MS = 2400
const PROP_ORBIT_MS = 3800

// One muted watercolor "spotlight" disk pulses behind the figure as the
// stage cue — references IMG_6573's formation marks.
const SPOTLIGHT_MS = 6400

export function Dancer() {
  const bodyRef = useRef<SVGGElement | null>(null)
  const skirtRef = useRef<SVGGElement | null>(null)
  const headRef = useRef<SVGGElement | null>(null)
  const hoopRef = useRef<SVGGElement | null>(null)
  const propRef = useRef<SVGGElement | null>(null)
  const spotlightRef = useRef<SVGCircleElement | null>(null)

  useRafLoop((elapsed) => {
    const bodyT = (elapsed % BODY_SWAY_MS) / BODY_SWAY_MS
    const bodyAngle = Math.sin(bodyT * Math.PI * 2) * 3
    bodyRef.current?.setAttribute(
      'transform',
      `rotate(${bodyAngle.toFixed(2)} ${SPINE_X} ${FLOOR})`,
    )

    const skirtT = (elapsed % SKIRT_SWAY_MS) / SKIRT_SWAY_MS
    const skirtAngle = -Math.sin(skirtT * Math.PI * 2) * 4
    skirtRef.current?.setAttribute(
      'transform',
      `rotate(${skirtAngle.toFixed(2)} ${SPINE_X} ${WAIST_Y})`,
    )

    const headT = (elapsed % HEAD_WOBBLE_MS) / HEAD_WOBBLE_MS
    const headAngle = Math.sin(headT * Math.PI * 2) * 6
    headRef.current?.setAttribute(
      'transform',
      `rotate(${headAngle.toFixed(2)} ${SPINE_X} ${HEAD_Y})`,
    )

    // Hoop "3D" rotation — scaleX through 0 mimics a paper disc tilting
    // edge-on. Anchored at the hoop's center, not the SVG origin.
    const hoopT = (elapsed % HOOP_SPIN_MS) / HOOP_SPIN_MS
    const sx = Math.cos(hoopT * Math.PI * 2)
    const hoopY = 88
    hoopRef.current?.setAttribute(
      'transform',
      `translate(${SPINE_X} ${hoopY}) scale(${sx.toFixed(3)} 1) translate(${-SPINE_X} ${-hoopY})`,
    )

    // Prop: orbits the right hand with held quarters via easeInOutCubic.
    const propT = (elapsed % PROP_ORBIT_MS) / PROP_ORBIT_MS
    const STEPS = 4
    const stepT = propT * STEPS
    const stepIdx = Math.floor(stepT)
    const local = stepT - stepIdx
    const eased = easeInOutCubic(local)
    const startAngle = (stepIdx / STEPS) * Math.PI * 2
    const endAngle = ((stepIdx + 1) / STEPS) * Math.PI * 2
    const orbitAngle = startAngle + eased * (endAngle - startAngle)
    const handX = 178
    const handY = SHOULDER_Y + 30
    const orbitR = 14
    const px = handX + orbitR * Math.cos(orbitAngle)
    const py = handY + orbitR * Math.sin(orbitAngle)
    propRef.current?.setAttribute(
      'transform',
      `translate(${(px - handX).toFixed(2)} ${(py - handY).toFixed(2)})`,
    )

    // Spotlight breathing: gentle scale around the figure's center.
    const spotT = (elapsed % SPOTLIGHT_MS) / SPOTLIGHT_MS
    const breath = 1 + Math.sin(spotT * Math.PI * 2) * 0.04
    if (spotlightRef.current) {
      spotlightRef.current.setAttribute('r', (78 * breath).toFixed(2))
    }
  })

  return (
    <Stage
      title="Dancer"
      caption="Five earned shapes, four phrase lengths, no rhythm match"
    >
      <div className="flex items-center justify-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[420px] w-auto"
          role="img"
          aria-label="A Schlemmer-style geometric dancer assembled from the prototype's earned shapes"
        >
          <defs>
            {/* Watercolor wash for the skirt — a soft radial gradient gives
                the bleed-on-paper feel without a real image filter. */}
            <radialGradient id="skirt-wash" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity="0.55" />
              <stop offset="70%" stopColor="var(--color-tertiary)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--color-tertiary-strong)" stopOpacity="0.22" />
            </radialGradient>
            <radialGradient id="spotlight-wash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
              <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="prop-wash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.35" />
            </radialGradient>
            {/* Hand-drawn imperfection on outlines */}
            <filter id="paper-edge" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="3" />
              <feDisplacementMap in="SourceGraphic" scale="0.6" />
            </filter>
          </defs>

          {/* Spotlight wash behind the figure — references the formation
              markers in IMG_6573. Breathes slowly via the rAF loop. */}
          <circle
            ref={spotlightRef}
            cx={SPINE_X}
            cy={WAIST_Y - 10}
            r={78}
            fill="url(#spotlight-wash)"
          />

          {/* Floor line — thin ink stroke, like a pencil rule */}
          <line
            x1={28}
            x2={W - 28}
            y1={FLOOR}
            y2={FLOOR}
            stroke="var(--color-text-tertiary)"
            strokeWidth={0.6}
          />

          <g ref={bodyRef} filter="url(#paper-edge)">
            {/* Skirt — wide cone, watercolor wash + dense thin pinstripes */}
            <g ref={skirtRef}>
              <polygon
                points={`${SPINE_X},${WAIST_Y} ${SPINE_X + 64},${FLOOR} ${SPINE_X - 64},${FLOOR}`}
                fill="url(#skirt-wash)"
                stroke="var(--color-stage)"
                strokeWidth={0.75}
                strokeLinejoin="round"
              />
              {/* Dense pinstripes fanning from waist apex to floor.
                  More stripes near the center, sparser at edges. */}
              {Array.from({ length: 15 }, (_, i) => i - 7).map((step) => {
                const dx = step * 9
                return (
                  <line
                    key={step}
                    x1={SPINE_X + step * 0.4}
                    x2={SPINE_X + dx}
                    y1={WAIST_Y + 1}
                    y2={FLOOR - 1}
                    stroke="var(--color-stage)"
                    strokeWidth={0.5}
                    opacity={0.55}
                  />
                )
              })}
            </g>

            {/* Torso — dark silhouette like the figures in IMG_6574.
                Slight bell shape, not a strict rectangle. */}
            <path
              d={`
                M ${SPINE_X - 22} ${SHOULDER_Y}
                Q ${SPINE_X - 28} ${WAIST_Y - 30} ${SPINE_X - 26} ${WAIST_Y}
                L ${SPINE_X + 26} ${WAIST_Y}
                Q ${SPINE_X + 28} ${WAIST_Y - 30} ${SPINE_X + 22} ${SHOULDER_Y}
                Z
              `}
              fill="var(--color-stage)"
              stroke="var(--color-stage)"
              strokeWidth={0.75}
            />

            {/* Arms — thin curved ink lines from shoulders. The right arm
                holds the prop; the left rests. */}
            <path
              d={`M ${SPINE_X - 22} ${SHOULDER_Y + 4} Q ${SPINE_X - 50} ${SHOULDER_Y + 36} ${SPINE_X - 56} ${SHOULDER_Y + 56}`}
              fill="none"
              stroke="var(--color-stage)"
              strokeWidth={1.1}
              strokeLinecap="round"
            />
            <path
              d={`M ${SPINE_X + 22} ${SHOULDER_Y + 4} Q ${SPINE_X + 44} ${SHOULDER_Y + 18} ${178} ${SHOULDER_Y + 30}`}
              fill="none"
              stroke="var(--color-stage)"
              strokeWidth={1.1}
              strokeLinecap="round"
            />
            {/* Hands — small open circles */}
            <circle cx={SPINE_X - 56} cy={SHOULDER_Y + 56} r={3} fill="var(--color-page)" stroke="var(--color-stage)" strokeWidth={0.75} />
            <circle cx={178} cy={SHOULDER_Y + 30} r={3} fill="var(--color-page)" stroke="var(--color-stage)" strokeWidth={0.75} />

            {/* Head — small ball with two face dots (eyes), no highlight */}
            <g ref={headRef}>
              <circle
                cx={SPINE_X}
                cy={HEAD_Y}
                r={18}
                fill="var(--color-page)"
                stroke="var(--color-stage)"
                strokeWidth={0.9}
              />
              <circle cx={SPINE_X - 6} cy={HEAD_Y - 1} r={1.1} fill="var(--color-stage)" />
              <circle cx={SPINE_X + 6} cy={HEAD_Y - 1} r={1.1} fill="var(--color-stage)" />
              {/* Tiny mouth — a single short curve */}
              <path
                d={`M ${SPINE_X - 3} ${HEAD_Y + 5} Q ${SPINE_X} ${HEAD_Y + 7} ${SPINE_X + 3} ${HEAD_Y + 5}`}
                fill="none"
                stroke="var(--color-stage)"
                strokeWidth={0.6}
              />
            </g>

            {/* Hoop — thin ink ellipse above head, spins via scaleX */}
            <g ref={hoopRef}>
              <path
                d={`M ${SPINE_X - 36} 88 A 36 11 0 0 1 ${SPINE_X + 36} 88`}
                fill="none"
                stroke="var(--color-stage)"
                strokeWidth={1.1}
                strokeLinecap="round"
              />
              <path
                d={`M ${SPINE_X - 36} 88 A 36 11 0 0 0 ${SPINE_X + 36} 88`}
                fill="none"
                stroke="var(--color-stage)"
                strokeWidth={1.1}
                strokeLinecap="round"
                opacity={0.35}
                strokeDasharray="1 2"
              />
            </g>

            {/* Prop — composite (paired watercolor blots), orbits right hand */}
            <g ref={propRef}>
              <circle cx={178} cy={SHOULDER_Y + 30} r={6.5} fill="url(#prop-wash)" stroke="var(--color-secondary-strong)" strokeWidth={0.6} />
              <circle cx={184} cy={SHOULDER_Y + 36} r={4.5} fill="var(--color-accent)" fillOpacity={0.55} stroke="var(--color-accent-strong)" strokeWidth={0.6} />
            </g>
          </g>
        </svg>
      </div>
    </Stage>
  )
}
