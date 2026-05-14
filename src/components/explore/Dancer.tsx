'use client'

import { useRef } from 'react'
import { Stage } from './Stage'
import { useRafLoop } from '@/lib/anim'

// Schlemmer-key marionette. Strictly the five earned shapes, matching the
// Shapes tab's geometry, gradient, ink stroke, and edge filter.
//
//   CIRCLE (fig.1, red accent)        → head, sits ON top of the torso
//   SQUARE (fig.4, black stage)       → torso
//   COMPOSITE (fig.5, red + blue)     → arms, slightly different sizes to
//                                       suggest 3D rotation
//   ARC (fig.3, yellow tertiary)      → skirt, vertically arranged ribs of
//                                       curved strokes
//   TRIANGLE (fig.2, blue secondary)  → legs, wide top, squat
//
// No rods, no internal lines, no hem strokes. The five shapes do the work.

const W = 360
const H = 460
const SPINE_X = 180
const INK = 'var(--color-stage)'

// HEAD — sits ON the torso (bottom of head circle tangent to top of torso)
const HEAD_R = 46
const HEAD_CY = 80

// TORSO — square, the visual mass
const TORSO_SIZE = 96
const TORSO_TOP_Y = HEAD_CY + HEAD_R // tangent, no overlap
const TORSO_LEFT_X = SPINE_X - TORSO_SIZE / 2
const TORSO_RIGHT_X = SPINE_X + TORSO_SIZE / 2
const TORSO_BOTTOM_Y = TORSO_TOP_Y + TORSO_SIZE

// ARMS — two composites, slightly different sizes (turn illusion)
const ARM_Y = TORSO_TOP_Y + TORSO_SIZE * 0.30
const ARM_SIZE_RIGHT = 84
const ARM_SIZE_LEFT = 76 // ~10% smaller — reads as "farther from viewer"

// SKIRT — a stack of canonical fig.3 semicircles (domes opening downward).
// Each is the literal fig.3 arc shape — a semicircle on a circle whose
// radius = half the endpoint-to-endpoint distance. Stacked vertically and
// gently widening, they read as a layered skirt.
const SKIRT_TOP_Y = TORSO_BOTTOM_Y - 2
const SKIRT_BAND_COUNT = 4
const SKIRT_BAND_GAP = 18
const SKIRT_ARC_COUNT = SKIRT_BAND_COUNT
const SKIRT_BOTTOM_Y = SKIRT_TOP_Y + (SKIRT_BAND_COUNT - 1) * SKIRT_BAND_GAP
// Narrower range so each dome reads clearly as a fig.3 semicircle.
const SKIRT_WAIST_HALF_WIDTH = 52
const SKIRT_HEM_HALF_WIDTH = 78
const SKIRT_HALF_WIDTH = SKIRT_HEM_HALF_WIDTH // for wash sizing

// LEGS — wide-at-top upside-down triangles. Squat aspect.
const LEG_TOP_Y = SKIRT_BOTTOM_Y + 4 // tuck just below the bottom arc
const LEG_FOOT_Y = LEG_TOP_Y + 56 // shorter
const LEG_TOP_HALF_WIDTH = 36 // wider at top
const LEG_OFFSET = 30 // close together

const FLOOR = LEG_FOOT_Y + 6

const BODY_BREATH_MS = 6800
const ARMS_SWAY_MS = 8400

export function Dancer() {
  const bodyRef = useRef<SVGGElement | null>(null)
  const armsRef = useRef<SVGGElement | null>(null)
  const spotlightRef = useRef<SVGCircleElement | null>(null)

  useRafLoop((elapsed) => {
    const breathT = (elapsed % BODY_BREATH_MS) / BODY_BREATH_MS
    const bob = Math.sin(breathT * Math.PI * 2) * 0.9
    bodyRef.current?.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`)

    const armsT = (elapsed % ARMS_SWAY_MS) / ARMS_SWAY_MS
    const armsAngle = Math.sin(armsT * Math.PI * 2) * 2.5
    armsRef.current?.setAttribute(
      'transform',
      `rotate(${armsAngle.toFixed(2)} ${SPINE_X} ${ARM_Y})`,
    )

    const sT = (elapsed % 6400) / 6400
    if (spotlightRef.current) {
      spotlightRef.current.setAttribute(
        'r',
        (150 * (1 + Math.sin(sT * Math.PI * 2) * 0.04)).toFixed(2),
      )
    }
  })

  return (
    <Stage
      title="Dancer"
      caption="Marionette built strictly from the five earned shapes — circle, square, arc, triangle, composite"
    >
      <div className="flex items-center justify-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[540px] w-auto"
          role="img"
          aria-label="A Schlemmer-style marionette composed of the five earned shapes from the Shapes tab"
        >
          <defs>
            <radialGradient id="spotlight-wash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
              <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </radialGradient>
            {/* Canonical shape fills — match ShapesShowcase exactly */}
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
            {/* Yellow ambient wash that sits behind the skirt arcs — matches
                the yellow cell wash behind fig.3 in ShapesShowcase. */}
            <radialGradient id="dancer-skirt-wash" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity={0.32} />
              <stop offset="60%" stopColor="var(--color-tertiary)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity={0} />
            </radialGradient>
            <filter id="dancer-edge" x="-3%" y="-3%" width="106%" height="106%">
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" />
              <feDisplacementMap in="SourceGraphic" scale="0.4" />
            </filter>
          </defs>

          {/* Spotlight pool */}
          <circle
            ref={spotlightRef}
            cx={SPINE_X}
            cy={TORSO_TOP_Y + TORSO_SIZE / 2 + 90}
            r={150}
            fill="url(#spotlight-wash)"
          />

          <g ref={bodyRef}>
            {/* Floor */}
            <line
              x1={32}
              x2={W - 32}
              y1={FLOOR}
              y2={FLOOR}
              stroke="var(--color-text-tertiary)"
              strokeWidth={0.5}
            />

            {/* TWO TRIANGLES (LEGS) — wide top, squat. Drawn first so the
                bottom of the skirt overlaps their tops. */}
            <g filter="url(#dancer-edge)">
              {[-1, 1].map((side) => {
                const cxTop = SPINE_X + side * LEG_OFFSET
                const tl = `${cxTop - LEG_TOP_HALF_WIDTH},${LEG_TOP_Y}`
                const tr = `${cxTop + LEG_TOP_HALF_WIDTH},${LEG_TOP_Y}`
                const apex = `${cxTop},${LEG_FOOT_Y}`
                return (
                  <polygon
                    key={side}
                    points={`${tl} ${tr} ${apex}`}
                    fill="url(#dancer-leg-fill)"
                    stroke={INK}
                    strokeWidth={0.7}
                    strokeLinejoin="round"
                  />
                )
              })}
            </g>

            {/* SKIRT — a stack of canonical fig.3 arcs (smile-shapes opening
                upward). Each arc uses the LITERAL fig.3 stroke: black ink
                (var(--color-stage)) at stroke-width 0.7, no fill. A soft
                yellow wash sits behind the stack as the ambient color,
                matching how fig.3's cell has a yellow wash behind the
                black-ink curve. The canonical fig.3 path is:
                  d="M 6 36 A 18 18 0 0 1 42 36"
                We render the same A-command at scaled widths, widening as
                the stack descends. */}

            {/* Yellow wash — ambient skirt color, matches fig.3's cell wash */}
            <ellipse
              cx={SPINE_X}
              cy={(SKIRT_TOP_Y + SKIRT_BOTTOM_Y) / 2 + 4}
              rx={SKIRT_HALF_WIDTH + 12}
              ry={(SKIRT_BOTTOM_Y - SKIRT_TOP_Y) / 2 + 16}
              fill="url(#dancer-skirt-wash)"
            />

            <g filter="url(#dancer-edge)">
              {Array.from({ length: SKIRT_ARC_COUNT }).map((_, i) => {
                const t = SKIRT_ARC_COUNT === 1 ? 0 : i / (SKIRT_ARC_COUNT - 1)
                const halfW =
                  SKIRT_WAIST_HALF_WIDTH +
                  (SKIRT_HEM_HALF_WIDTH - SKIRT_WAIST_HALF_WIDTH) * t
                const yEnd = SKIRT_TOP_Y + i * SKIRT_BAND_GAP
                // Canonical fig.3 path: "M 6 36 A 18 18 0 0 1 42 36".
                // Endpoints span 36; radius = 18 = half the span. This is a
                // semicircle (180° arc) opening downward — a dome. We
                // preserve those exact proportions: radius = halfW, so each
                // skirt arc is a fig.3-proportioned semicircle scaled to
                // its band width.
                return (
                  <path
                    key={i}
                    d={`
                      M ${SPINE_X - halfW} ${yEnd}
                      A ${halfW} ${halfW} 0 0 1 ${SPINE_X + halfW} ${yEnd}
                    `}
                    fill="none"
                    stroke="var(--color-stage)"
                    strokeWidth={0.9}
                    strokeLinecap="round"
                  />
                )
              })}
            </g>

            {/* SQUARE (TORSO) */}
            <g filter="url(#dancer-edge)">
              <rect
                x={TORSO_LEFT_X}
                y={TORSO_TOP_Y}
                width={TORSO_SIZE}
                height={TORSO_SIZE}
                fill="url(#dancer-torso-fill)"
                stroke={INK}
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
            </g>

            {/* TWO COMPOSITES (ARMS) — slightly different sizes to suggest
                3D rotation. Right arm renders canonical; left arm is
                mirrored AND slightly smaller. */}
            <g ref={armsRef} filter="url(#dancer-edge)">
              {[
                { side: 1, size: ARM_SIZE_RIGHT },
                { side: -1, size: ARM_SIZE_LEFT },
              ].map(({ side, size }) => {
                const torsoEdgeX = side === -1 ? TORSO_LEFT_X : TORSO_RIGHT_X
                const scale = size / 48
                if (side === 1) {
                  const offsetX = torsoEdgeX - 6 * scale
                  const offsetY = ARM_Y - 16 * scale
                  return (
                    <g
                      key={side}
                      transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}
                    >
                      <circle
                        cx={16}
                        cy={16}
                        r={10}
                        fill="url(#dancer-arm-circle-fill)"
                        stroke={INK}
                        strokeWidth={0.55}
                      />
                      <rect
                        x={22}
                        y={22}
                        width={20}
                        height={20}
                        fill="url(#dancer-arm-square-fill)"
                        stroke={INK}
                        strokeWidth={0.55}
                      />
                    </g>
                  )
                } else {
                  const offsetX = torsoEdgeX + 6 * scale
                  const offsetY = ARM_Y - 16 * scale
                  return (
                    <g
                      key={side}
                      transform={`translate(${offsetX} ${offsetY}) scale(${-scale} ${scale})`}
                    >
                      <circle
                        cx={16}
                        cy={16}
                        r={10}
                        fill="url(#dancer-arm-circle-fill)"
                        stroke={INK}
                        strokeWidth={0.55}
                      />
                      <rect
                        x={22}
                        y={22}
                        width={20}
                        height={20}
                        fill="url(#dancer-arm-square-fill)"
                        stroke={INK}
                        strokeWidth={0.55}
                      />
                    </g>
                  )
                }
              })}
            </g>

            {/* CIRCLE (HEAD) — sits ON the torso (bottom tangent to top edge) */}
            <g filter="url(#dancer-edge)">
              <circle
                cx={SPINE_X}
                cy={HEAD_CY}
                r={HEAD_R}
                fill="url(#dancer-head-fill)"
                stroke={INK}
                strokeWidth={0.9}
              />
            </g>
          </g>
        </svg>
      </div>
    </Stage>
  )
}
