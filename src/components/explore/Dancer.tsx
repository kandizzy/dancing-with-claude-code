'use client'

import { useRef } from 'react'
import { Stage } from './Stage'
import { useRafLoop } from '@/lib/anim'

// ============================================================================
// Schlemmer-key marionette. Strictly the five earned shapes, matching the
// Shapes tab's geometry, gradient, ink stroke, and edge filter.
//
//   CIRCLE (fig.1, red accent)        → head, sits ON top of the torso
//   SQUARE (fig.4, black stage)       → torso
//   COMPOSITE (fig.5, red + blue)     → arms, slightly different sizes to
//                                       suggest 3D rotation
//   ARC (fig.3, yellow tertiary)      → skirt, rendered as TILED COPIES of
//                                       the fig.3 card itself (mini cards,
//                                       overlapping in a row)
//   TRIANGLE (fig.2, blue secondary)  → legs, wide top, squat
// ============================================================================

// ============================================================================
// Vertex / parameter vocabulary — reference these names when iterating.
//
//   Spine & canvas:    W, H, SPINE_X
//   Head:              HEAD_R, HEAD_CY
//   Torso:             TORSO_SIZE, TORSO_TOP_Y, TORSO_TILT
//                      (derived: TORSO_LEFT_X, TORSO_RIGHT_X, TORSO_BOTTOM_Y)
//   Arms:              ARM_Y, ARM_SIZE_LEFT, ARM_SIZE_RIGHT
//   Skirt (tiles):     SKIRT_TILE_COUNT, SKIRT_TILE_SIZE,
//                      SKIRT_TILE_OVERLAP, SKIRT_Y, SKIRT_HORIZONTAL_SPREAD,
//                      SKIRT_TILT_PER_TILE
//   Legs (triangle vertices: TOP_LEFT, TOP_RIGHT, APEX):
//                      LEG_OFFSET, LEG_TOP_HALF_WIDTH, LEG_HEIGHT
//                      (derived: LEG_TOP_Y, LEG_APEX_Y)
//
// Example feedback I can act on:
//   "Make the head 10% smaller"            → adjust HEAD_R
//   "Push leg APEX out from spine by 6px"  → adjust LEG_OFFSET or per-leg sign
//   "Tilt the torso 4° clockwise"          → adjust TORSO_TILT
//   "Skirt tiles overlap more"             → adjust SKIRT_TILE_OVERLAP
//   "Add a 6th skirt tile"                 → adjust SKIRT_TILE_COUNT
// ============================================================================

const W = 360
const H = 460
const SPINE_X = 180
const INK = 'var(--color-stage)'

// HEAD — circle, sits ON the torso (tangent at top of torso)
const HEAD_R = 46
const HEAD_CY = 80

// TORSO — square, the visual mass. TORSO_TILT in degrees, signed.
const TORSO_SIZE = 96
const TORSO_TOP_Y = HEAD_CY + HEAD_R
const TORSO_TILT = 0
const TORSO_LEFT_X = SPINE_X - TORSO_SIZE / 2
const TORSO_RIGHT_X = SPINE_X + TORSO_SIZE / 2
const TORSO_BOTTOM_Y = TORSO_TOP_Y + TORSO_SIZE

// ARMS — composites, slightly different sizes (turn illusion)
const ARM_Y = TORSO_TOP_Y + TORSO_SIZE * 0.30
const ARM_SIZE_RIGHT = 84
const ARM_SIZE_LEFT = 76

// SKIRT — TILED COPIES of the fig.3 card. Each tile is a miniature of the
// fig.3 cell from the Shapes tab: dashed pencil border, "FIG. 3" label,
// the arc shape, soft yellow wash. Tiles overlap horizontally and shift
// slightly down/rotated to read as a single skirt rather than discrete cards.
const SKIRT_TILE_COUNT = 4
const SKIRT_TILE_SIZE = 96 // px square per tile — larger so the row overlaps both torso and legs
const SKIRT_TILE_OVERLAP = 32 // px each tile overlaps the previous one
const SKIRT_Y = TORSO_BOTTOM_Y - 14 // top edge pulled up into the torso
const SKIRT_HORIZONTAL_SPREAD =
  SKIRT_TILE_SIZE + (SKIRT_TILE_COUNT - 1) * (SKIRT_TILE_SIZE - SKIRT_TILE_OVERLAP)
const SKIRT_LEFT_X = SPINE_X - SKIRT_HORIZONTAL_SPREAD / 2
const SKIRT_TILT_PER_TILE = -2 // degrees of rotation accumulated per tile

// LEGS — two upside-down triangles. Vertex names:
//   TOP_LEFT  = top-left corner of the triangle's base (at LEG_TOP_Y)
//   TOP_RIGHT = top-right corner of the triangle's base (at LEG_TOP_Y)
//   APEX      = bottom point of the triangle (at LEG_TOP_Y + LEG_HEIGHT)
// Wide top, squat aspect.
const LEG_OFFSET = 36 // x-offset from spine to each leg's center
const LEG_TOP_HALF_WIDTH = 36 // half-width of the triangle's base
const LEG_HEIGHT = 56 // vertical distance from top edge to APEX
const LEG_TOP_Y = TORSO_BOTTOM_Y + SKIRT_TILE_SIZE - 28 // legs tuck up into the skirt
const LEG_APEX_Y = LEG_TOP_Y + LEG_HEIGHT

const FLOOR = LEG_APEX_Y + 8

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
      title="A dancer"
      caption="An exploration of the basic elements of theatrical creation and design"
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
            cy={TORSO_TOP_Y + TORSO_SIZE / 2 + 90}
            r={150}
            fill="url(#spotlight-wash)"
          />

          <g ref={bodyRef}>
            <line
              x1={32}
              x2={W - 32}
              y1={FLOOR}
              y2={FLOOR}
              stroke="var(--color-text-tertiary)"
              strokeWidth={0.5}
            />

            {/* TWO TRIANGLES (LEGS) */}
            <g filter="url(#dancer-edge)">
              {[-1, 1].map((side) => {
                const cxTop = SPINE_X + side * LEG_OFFSET
                const tl = `${cxTop - LEG_TOP_HALF_WIDTH},${LEG_TOP_Y}` // TOP_LEFT
                const tr = `${cxTop + LEG_TOP_HALF_WIDTH},${LEG_TOP_Y}` // TOP_RIGHT
                const apex = `${cxTop},${LEG_APEX_Y}` // APEX
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

            {/* SKIRT — four copies of the canonical fig.3 arc placed in a
                horizontal row, overlapping. Just the arc shape itself —
                black ink stroke, yellow wash behind. No card chrome, no
                labels. The arcs ARE the skirt; their tiling is what reads
                as costume mass. */}
            <g>
              {/* Single yellow wash spanning the whole skirt row */}
              <ellipse
                cx={SPINE_X}
                cy={SKIRT_Y + SKIRT_TILE_SIZE / 2}
                rx={SKIRT_HORIZONTAL_SPREAD / 2 + 6}
                ry={SKIRT_TILE_SIZE * 0.45}
                fill="url(#dancer-skirt-tile-wash)"
              />
              <g filter="url(#dancer-edge)">
                {Array.from({ length: SKIRT_TILE_COUNT }).map((_, i) => {
                  const tileX =
                    SKIRT_LEFT_X + i * (SKIRT_TILE_SIZE - SKIRT_TILE_OVERLAP)
                  const tileCenterX = tileX + SKIRT_TILE_SIZE / 2
                  const tileCenterY = SKIRT_Y + SKIRT_TILE_SIZE / 2
                  // Rotation: tiles on the LEFT half rotate -90° (counter-
                  // clockwise), tiles on the RIGHT half rotate +90°
                  // (clockwise). Domes-up become vertical brackets meeting
                  // in the middle: “)(” on the left half, “()” on the right.
                  const isLeftHalf = i < SKIRT_TILE_COUNT / 2
                  const rotation = isLeftHalf ? -90 : 90
                  const scale = (SKIRT_TILE_SIZE * 0.85) / 48
                  const offsetX = tileX + (SKIRT_TILE_SIZE * 0.075)
                  const offsetY = SKIRT_Y + (SKIRT_TILE_SIZE * 0.075)
                  return (
                    <g
                      key={i}
                      transform={`rotate(${rotation} ${tileCenterX} ${tileCenterY}) translate(${offsetX} ${offsetY}) scale(${scale})`}
                    >
                      <path
                        d="M 6 36 A 18 18 0 0 1 42 36"
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

            {/* SQUARE (TORSO) */}
            <g filter="url(#dancer-edge)" transform={TORSO_TILT !== 0 ? `rotate(${TORSO_TILT} ${SPINE_X} ${TORSO_TOP_Y + TORSO_SIZE / 2})` : undefined}>
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

            {/* TWO COMPOSITES (ARMS) */}
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

            {/* CIRCLE (HEAD) */}
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
