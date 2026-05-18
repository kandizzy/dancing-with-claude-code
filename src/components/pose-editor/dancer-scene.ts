/**
 * The Bauhaus dancer translated to scene data.
 *
 * This is a direct translation of `src/components/explore/Dancer.tsx` — same
 * coordinates, same dimensions, same render order. The original component
 * computed these from named constants (HEAD_R, TORSO_TOP_Y, etc.); we resolve
 * them to absolute numbers here so the editor can render and manipulate them
 * without recomputing from a parameter graph.
 *
 * Render order (back to front):
 *   1. Legs (two triangles)
 *   2. Skirt (composite of 4 arcs)
 *   3. Torso (square)
 *   4. Arms (two composites: circle + square each)
 *   5. Head (circle)
 *
 * This matches the original Dancer's draw order so the pose editor's initial
 * render should be visually identical (modulo the spotlight wash, breathing
 * animation, and paper-grain texture — those are render-time effects, not
 * shape data, and we'll add them back in Phase 1).
 */

import type { Scene } from './types'

// ---------------------------------------------------------------------------
// Original constants from Dancer.tsx — kept here as named values so the
// translation is auditable. Future shape edits in the editor will write back
// to vertex coords directly; these constants are documentation only.
// ---------------------------------------------------------------------------

const W = 360
const H = 460
const SPINE_X = 180
const INK = 'var(--color-stage)'

// Head
const HEAD_R = 46
const HEAD_CY = 80

// Torso
const TORSO_SIZE = 96
const TORSO_TOP_Y = HEAD_CY + HEAD_R // = 126
const TORSO_LEFT_X = SPINE_X - TORSO_SIZE / 2 // = 132
const TORSO_RIGHT_X = SPINE_X + TORSO_SIZE / 2 // = 228
const TORSO_BOTTOM_Y = TORSO_TOP_Y + TORSO_SIZE // = 222

// Arms
const ARM_Y = TORSO_TOP_Y + TORSO_SIZE * 0.30 // = 154.8
const ARM_SIZE_RIGHT = 84
const ARM_SIZE_LEFT = 76

// Skirt
const SKIRT_TILE_COUNT = 4
const SKIRT_TILE_SIZE = 96
const SKIRT_TILE_OVERLAP = 32
const SKIRT_Y = TORSO_BOTTOM_Y - 14 // = 208
const SKIRT_HORIZONTAL_SPREAD =
  SKIRT_TILE_SIZE + (SKIRT_TILE_COUNT - 1) * (SKIRT_TILE_SIZE - SKIRT_TILE_OVERLAP)
const SKIRT_LEFT_X = SPINE_X - SKIRT_HORIZONTAL_SPREAD / 2

// Legs
const LEG_OFFSET = 36
const LEG_TOP_HALF_WIDTH = 36
const LEG_HEIGHT = 56
const LEG_TOP_Y = TORSO_BOTTOM_Y + SKIRT_TILE_SIZE - 28 // = 290
const LEG_APEX_Y = LEG_TOP_Y + LEG_HEIGHT // = 346

// ---------------------------------------------------------------------------
// Scene definition
// ---------------------------------------------------------------------------

export const DANCER_SCENE: Scene = {
  id: 'dancer-default',
  name: 'A dancer',
  width: W,
  height: H,
  shapes: [
    // ---------- LEFT LEG (back layer) ----------
    // Anchor at the midpoint of the top edge (the hip). Rotating around the
    // anchor makes the leg swing forward/back like at a hip joint.
    {
      id: 'leg-left',
      label: 'Left leg',
      kind: 'triangle',
      vertices: [
        { x: SPINE_X - LEG_OFFSET - LEG_TOP_HALF_WIDTH, y: LEG_TOP_Y }, // TOP_LEFT
        { x: SPINE_X - LEG_OFFSET + LEG_TOP_HALF_WIDTH, y: LEG_TOP_Y }, // TOP_RIGHT
        { x: SPINE_X - LEG_OFFSET, y: LEG_APEX_Y }, // APEX
      ],
      anchor: { x: SPINE_X - LEG_OFFSET, y: LEG_TOP_Y },
      style: {
        fill: 'url(#dancer-leg-fill)',
        stroke: INK,
        strokeWidth: 0.7,
        filterId: 'dancer-edge',
      },
    },

    // ---------- RIGHT LEG ----------
    {
      id: 'leg-right',
      label: 'Right leg',
      kind: 'triangle',
      vertices: [
        { x: SPINE_X + LEG_OFFSET - LEG_TOP_HALF_WIDTH, y: LEG_TOP_Y },
        { x: SPINE_X + LEG_OFFSET + LEG_TOP_HALF_WIDTH, y: LEG_TOP_Y },
        { x: SPINE_X + LEG_OFFSET, y: LEG_APEX_Y },
      ],
      anchor: { x: SPINE_X + LEG_OFFSET, y: LEG_TOP_Y },
      style: {
        fill: 'url(#dancer-leg-fill)',
        stroke: INK,
        strokeWidth: 0.7,
        filterId: 'dancer-edge',
      },
    },

    // ---------- SKIRT (composite of 4 arcs) ----------
    // In the original, the 4 arcs are tiled across the row and rotated -90° on
    // the left half, +90° on the right. Each arc's geometry is the canonical
    // "M 6 36 A 18 18 0 0 1 42 36" path (a small dome) scaled and translated.
    //
    // Translating this to our Scene model is tricky: the canonical path is a
    // semi-circular arc with radius 18 around center (24, 36), rendered in a
    // local 48×48 space. To express it as an ArcShape we need:
    //   - center in world coords
    //   - radius in world units
    //   - startAngle and endAngle in degrees (SVG conv: 0° right, CW positive)
    //
    // The 4 arcs end up looking like brackets "( ) ( )" meeting in the middle.
    // I'm modeling each one as a separate ArcShape inside a composite.
    //
    // Each arc tile is rotated 90° around its tile center, then we extract the
    // resulting arc parameters in world coords. The math below precomputes
    // those.
    (() => {
      // Precompute per-tile world geometry. Each tile occupies (tileX, SKIRT_Y)
      // and is SKIRT_TILE_SIZE square. The canonical arc inside lives at local
      // (24, 36) with radius 18 in a 48×48 space, scaled by 0.85 of tile size.
      const scale = (SKIRT_TILE_SIZE * 0.85) / 48
      const arcs = Array.from({ length: SKIRT_TILE_COUNT }).map((_, i) => {
        const tileX = SKIRT_LEFT_X + i * (SKIRT_TILE_SIZE - SKIRT_TILE_OVERLAP)
        const tileCenterX = tileX + SKIRT_TILE_SIZE / 2
        const tileCenterY = SKIRT_Y + SKIRT_TILE_SIZE / 2

        // Canonical arc geometry in the tile's local 48×48 space:
        //   center (24, 36), radius 18, opens downward (path goes from 180° to 0° CCW)
        // After the tile's translate+scale, the arc's center sits at:
        const localCx = 24
        const localCy = 36
        const offsetX = tileX + SKIRT_TILE_SIZE * 0.075
        const offsetY = SKIRT_Y + SKIRT_TILE_SIZE * 0.075

        const preRotateCx = offsetX + localCx * scale
        const preRotateCy = offsetY + localCy * scale
        const worldRadius = 18 * scale

        // Apply the tile's rotation (left half -90°, right half +90°) around
        // the tile center.
        const isLeftHalf = i < SKIRT_TILE_COUNT / 2
        const rotationDeg = isLeftHalf ? -90 : 90
        const rotationRad = (rotationDeg * Math.PI) / 180
        const dx = preRotateCx - tileCenterX
        const dy = preRotateCy - tileCenterY
        const rotatedDx = dx * Math.cos(rotationRad) - dy * Math.sin(rotationRad)
        const rotatedDy = dx * Math.sin(rotationRad) + dy * Math.cos(rotationRad)
        const worldCx = tileCenterX + rotatedDx
        const worldCy = tileCenterY + rotatedDy

        // The original arc path "M 6 36 A 18 18 0 0 1 42 36" sweeps from
        // local (6, 36) to (42, 36) with the dome opening down. In SVG-angle
        // terms (0° = right, CW positive), the start point is at angle 180°
        // from center, end point at 0°. With sweep-flag=1, the arc goes
        // clockwise from start to end, but since it's a "dome up" arc, it
        // arcs through the upper half (angles 180° → 270° → 0° in screen
        // space, since SVG Y axis is flipped). Effectively the visible arc
        // spans angle 180° to 360° in screen-coords (0° pointing right,
        // angles increasing clockwise).
        //
        // After rotation, those start/end angles shift by rotationDeg.
        const baseStart = 180
        const baseEnd = 360
        return {
          id: `skirt-arc-${i}`,
          label: `Skirt arc ${i + 1}`,
          worldCx,
          worldCy,
          worldRadius,
          startAngle: baseStart + rotationDeg,
          endAngle: baseEnd + rotationDeg,
        }
      })

      const composite = {
        id: 'skirt',
        label: 'Skirt',
        kind: 'composite' as const,
        anchor: { x: SPINE_X, y: SKIRT_Y + SKIRT_TILE_SIZE / 2 },
        children: arcs.map((a) => ({
          id: a.id,
          label: a.label,
          kind: 'arc' as const,
          center: { x: a.worldCx, y: a.worldCy },
          radius: a.worldRadius,
          startAngle: a.startAngle,
          endAngle: a.endAngle,
          style: {
            stroke: INK,
            strokeWidth: 1.0,
            filterId: 'dancer-edge',
          },
        })),
      }
      return composite
    })(),

    // ---------- TORSO (square) ----------
    {
      id: 'torso',
      label: 'Torso',
      kind: 'square',
      vertices: [
        { x: TORSO_LEFT_X, y: TORSO_TOP_Y }, // TL
        { x: TORSO_RIGHT_X, y: TORSO_TOP_Y }, // TR
        { x: TORSO_RIGHT_X, y: TORSO_BOTTOM_Y }, // BR
        { x: TORSO_LEFT_X, y: TORSO_BOTTOM_Y }, // BL
      ],
      style: {
        fill: 'url(#dancer-torso-fill)',
        stroke: INK,
        strokeWidth: 0.9,
        filterId: 'dancer-edge',
      },
    },

    // ---------- RIGHT ARM (composite: circle + square) ----------
    // The original Dancer scales a 16x16 + 22,22,20,20 layout by 84/48 = 1.75.
    // We expand the world coordinates here:
    //   scale = 1.75
    //   composite anchor (where translate puts the (0,0) of local coords):
    //     offsetX = TORSO_RIGHT_X - 6 * 1.75 = 228 - 10.5 = 217.5
    //     offsetY = ARM_Y - 16 * 1.75 = 154.8 - 28 = 126.8
    //
    //   Right-arm CIRCLE: local center (16, 16), r=10
    //     world center: (217.5 + 16*1.75, 126.8 + 16*1.75) = (245.5, 154.8)
    //     world radius: 10 * 1.75 = 17.5
    //
    //   Right-arm SQUARE: local (22, 22) size 20
    //     world TL: (217.5 + 22*1.75, 126.8 + 22*1.75) = (256, 165.3)
    //     world size: 20 * 1.75 = 35
    {
      id: 'arm-right',
      label: 'Right arm',
      kind: 'composite',
      anchor: { x: TORSO_RIGHT_X, y: ARM_Y },
      children: [
        {
          id: 'arm-right-circle',
          label: 'Right hand',
          kind: 'circle',
          center: {
            x: TORSO_RIGHT_X - 6 * (ARM_SIZE_RIGHT / 48) + 16 * (ARM_SIZE_RIGHT / 48),
            y: ARM_Y - 16 * (ARM_SIZE_RIGHT / 48) + 16 * (ARM_SIZE_RIGHT / 48),
          },
          radius: 10 * (ARM_SIZE_RIGHT / 48),
          style: {
            fill: 'url(#dancer-arm-circle-fill)',
            stroke: INK,
            strokeWidth: 0.55,
          },
        },
        {
          id: 'arm-right-square',
          label: 'Right forearm',
          kind: 'square',
          vertices: (() => {
            const s = ARM_SIZE_RIGHT / 48
            const ox = TORSO_RIGHT_X - 6 * s
            const oy = ARM_Y - 16 * s
            const tlx = ox + 22 * s
            const tly = oy + 22 * s
            const size = 20 * s
            return [
              { x: tlx, y: tly },
              { x: tlx + size, y: tly },
              { x: tlx + size, y: tly + size },
              { x: tlx, y: tly + size },
            ] as [
              { x: number; y: number },
              { x: number; y: number },
              { x: number; y: number },
              { x: number; y: number },
            ]
          })(),
          style: {
            fill: 'url(#dancer-arm-square-fill)',
            stroke: INK,
            strokeWidth: 0.55,
          },
        },
      ],
    },

    // ---------- LEFT ARM (composite, mirrored) ----------
    // The original uses scale(-x, y) to flip horizontally. To keep the editor
    // shape-first (no negative scales in normal shapes), we expand to mirrored
    // world coords directly: the circle and square are positioned as if the
    // right arm were reflected across the SPINE_X axis.
    {
      id: 'arm-left',
      label: 'Left arm',
      kind: 'composite',
      anchor: { x: TORSO_LEFT_X, y: ARM_Y },
      children: [
        {
          id: 'arm-left-circle',
          label: 'Left hand',
          kind: 'circle',
          center: (() => {
            const s = ARM_SIZE_LEFT / 48
            const ox = TORSO_LEFT_X + 6 * s
            const oy = ARM_Y - 16 * s
            // After local mirror: local (16, 16) becomes world (ox - 16*s, oy + 16*s)
            return { x: ox - 16 * s, y: oy + 16 * s }
          })(),
          radius: 10 * (ARM_SIZE_LEFT / 48),
          style: {
            fill: 'url(#dancer-arm-circle-fill)',
            stroke: INK,
            strokeWidth: 0.55,
          },
        },
        {
          id: 'arm-left-square',
          label: 'Left forearm',
          kind: 'square',
          vertices: (() => {
            const s = ARM_SIZE_LEFT / 48
            const ox = TORSO_LEFT_X + 6 * s
            const oy = ARM_Y - 16 * s
            // Mirrored: local (22..42, 22..42) becomes world (ox - 42*s..ox - 22*s, oy + 22*s..oy + 42*s)
            const rx = ox - 22 * s
            const lx = ox - 42 * s
            const ty = oy + 22 * s
            const by = oy + 42 * s
            return [
              { x: lx, y: ty },
              { x: rx, y: ty },
              { x: rx, y: by },
              { x: lx, y: by },
            ] as [
              { x: number; y: number },
              { x: number; y: number },
              { x: number; y: number },
              { x: number; y: number },
            ]
          })(),
          style: {
            fill: 'url(#dancer-arm-square-fill)',
            stroke: INK,
            strokeWidth: 0.55,
          },
        },
      ],
    },

    // ---------- HEAD (circle, on top) ----------
    {
      id: 'head',
      label: 'Head',
      kind: 'circle',
      center: { x: SPINE_X, y: HEAD_CY },
      radius: HEAD_R,
      style: {
        fill: 'url(#dancer-head-fill)',
        stroke: INK,
        strokeWidth: 0.9,
        filterId: 'dancer-edge',
      },
    },
  ],
}
