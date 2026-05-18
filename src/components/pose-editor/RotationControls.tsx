/**
 * Rotation handle for the selected shape.
 *
 * Renders two interactive elements:
 *   1. A circular anchor marker at the shape's pivot point. Drag to move the
 *      pivot. The visible mark is a small ring with a crosshair.
 *   2. A rotation handle above the shape's bounding box, connected to the
 *      anchor by a thin line. Drag to rotate the shape around the anchor.
 *
 * Rotation math:
 *   - Snapshot the shape's geometry and the initial angle (anchor → pointer)
 *     at drag-start.
 *   - On each move, compute the new angle and the delta from the initial.
 *   - Apply the rotation matrix to the snapshotted geometry.
 *
 * For arcs we don't rotate every point; we just shift startAngle and endAngle
 * (and the center, if the anchor isn't the center).
 */

'use client'

import { useRef, type RefObject } from 'react'
import { useShapeDrag } from './useShapeDrag'
import type { Point, Shape } from './types'

type RotationControlsProps = {
  shape: Shape
  svgRef: RefObject<SVGSVGElement | null>
  onUpdate: (next: Shape) => void
  onPushHistory: () => void
}

export function RotationControls({
  shape,
  svgRef,
  onUpdate,
  onPushHistory,
}: RotationControlsProps) {
  if (shape.kind === 'composite') return null

  const anchor = getAnchor(shape)
  const boundsTop = getBoundingTopY(shape)

  // Rotation handle position: 24 SVG units above the top of the bounding box,
  // horizontally aligned with the anchor. This keeps it readable for any
  // shape position and size.
  const handleOffset = 24
  const rotationHandlePoint: Point = { x: anchor.x, y: boundsTop - handleOffset }

  return (
    <>
      {/* Faint line from anchor to rotation handle so the user can see the
          pivot relationship. Drawn first so handles render on top. */}
      <line
        x1={anchor.x}
        y1={anchor.y}
        x2={rotationHandlePoint.x}
        y2={rotationHandlePoint.y}
        stroke="var(--color-accent)"
        strokeWidth={0.7}
        strokeDasharray="2 2"
        pointerEvents="none"
      />

      <AnchorHandle
        anchor={anchor}
        shape={shape}
        svgRef={svgRef}
        onUpdate={onUpdate}
        onPushHistory={onPushHistory}
      />

      <RotationHandle
        point={rotationHandlePoint}
        shape={shape}
        anchor={anchor}
        svgRef={svgRef}
        onUpdate={onUpdate}
        onPushHistory={onPushHistory}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// AnchorHandle — small marker at the pivot point. Draggable to move the pivot.
// ---------------------------------------------------------------------------

function AnchorHandle({
  anchor,
  shape,
  svgRef,
  onUpdate,
  onPushHistory,
}: {
  anchor: Point
  shape: Shape
  svgRef: RefObject<SVGSVGElement | null>
  onUpdate: (next: Shape) => void
  onPushHistory: () => void
}) {
  const handlers = useShapeDrag({
    svgRef,
    onDragStart: () => onPushHistory(),
    onDrag: (p) => {
      // Anchor lives on the shape itself, set explicitly. We don't deform
      // the shape; we just move where it rotates around.
      if (shape.kind === 'composite') return
      onUpdate({ ...shape, anchor: p } as Shape)
    },
  })
  return (
    <g {...handlers} style={{ cursor: 'crosshair' }}>
      {/* Hit area — small so it doesn't overlap the polygon translate handle
         that sits at the same point by default. */}
      <circle cx={anchor.x} cy={anchor.y} r={4} fill="transparent" />
      {/* Crosshair: ring + small cross marks */}
      <circle
        cx={anchor.x}
        cy={anchor.y}
        r={5}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.2}
        pointerEvents="none"
      />
      <line
        x1={anchor.x - 7}
        y1={anchor.y}
        x2={anchor.x - 3}
        y2={anchor.y}
        stroke="var(--color-accent)"
        strokeWidth={1}
        pointerEvents="none"
      />
      <line
        x1={anchor.x + 3}
        y1={anchor.y}
        x2={anchor.x + 7}
        y2={anchor.y}
        stroke="var(--color-accent)"
        strokeWidth={1}
        pointerEvents="none"
      />
      <line
        x1={anchor.x}
        y1={anchor.y - 7}
        x2={anchor.x}
        y2={anchor.y - 3}
        stroke="var(--color-accent)"
        strokeWidth={1}
        pointerEvents="none"
      />
      <line
        x1={anchor.x}
        y1={anchor.y + 3}
        x2={anchor.x}
        y2={anchor.y + 7}
        stroke="var(--color-accent)"
        strokeWidth={1}
        pointerEvents="none"
      />
    </g>
  )
}

// ---------------------------------------------------------------------------
// RotationHandle — drag to rotate the shape around its anchor.
// ---------------------------------------------------------------------------

function RotationHandle({
  point,
  shape,
  anchor,
  svgRef,
  onUpdate,
  onPushHistory,
}: {
  point: Point
  shape: Shape
  anchor: Point
  svgRef: RefObject<SVGSVGElement | null>
  onUpdate: (next: Shape) => void
  onPushHistory: () => void
}) {
  // Snapshot at drag-start so the math is stable as the pointer moves.
  // Without this, computing "current angle minus previous angle" on each
  // pointermove would accumulate floating-point drift and feel jittery.
  const dragStart = useRef<{
    shapeAtStart: Shape
    startAngle: number
  } | null>(null)

  const handlers = useShapeDrag({
    svgRef,
    onDragStart: (p) => {
      onPushHistory()
      const startAngle = Math.atan2(p.y - anchor.y, p.x - anchor.x)
      dragStart.current = {
        shapeAtStart: cloneShape(shape),
        startAngle,
      }
    },
    onDrag: (p) => {
      const start = dragStart.current
      if (!start) return
      const currentAngle = Math.atan2(p.y - anchor.y, p.x - anchor.x)
      const deltaRad = currentAngle - start.startAngle
      const rotated = rotateShape(start.shapeAtStart, anchor, deltaRad)
      onUpdate(rotated)
    },
    onDragEnd: () => {
      dragStart.current = null
    },
  })

  return (
    <g {...handlers} style={{ cursor: 'grab' }}>
      <circle cx={point.x} cy={point.y} r={10} fill="transparent" />
      {/* Visible handle: an outlined circle with a small curved arrow icon
          implied by the dashed connector line above. */}
      <circle
        cx={point.x}
        cy={point.y}
        r={5}
        fill="var(--color-page)"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        pointerEvents="none"
      />
      {/* A small inner dot to distinguish rotation handle from vertex handles. */}
      <circle
        cx={point.x}
        cy={point.y}
        r={1.5}
        fill="var(--color-accent)"
        pointerEvents="none"
      />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function getAnchor(shape: Shape): Point {
  if (shape.kind === 'composite') return shape.anchor
  if ('anchor' in shape && shape.anchor) return shape.anchor

  switch (shape.kind) {
    case 'circle':
    case 'arc':
      return shape.center
    case 'square':
    case 'triangle':
      return centroidOf(shape.vertices)
  }
}

function getBoundingTopY(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
    case 'arc':
      return shape.center.y - shape.radius
    case 'square':
    case 'triangle':
      return Math.min(...shape.vertices.map((v) => v.y))
    case 'composite': {
      const childTops = shape.children.map((c) => getBoundingTopY(c))
      return Math.min(...childTops)
    }
  }
}

function centroidOf(vertices: readonly Point[]): Point {
  const n = vertices.length
  const x = vertices.reduce((sum, v) => sum + v.x, 0) / n
  const y = vertices.reduce((sum, v) => sum + v.y, 0) / n
  return { x, y }
}

function rotatePoint(p: Point, anchor: Point, angleRad: number): Point {
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const dx = p.x - anchor.x
  const dy = p.y - anchor.y
  return {
    x: anchor.x + dx * cos - dy * sin,
    y: anchor.y + dx * sin + dy * cos,
  }
}

function rotateShape(shape: Shape, anchor: Point, angleRad: number): Shape {
  switch (shape.kind) {
    case 'circle':
      return {
        ...shape,
        center: rotatePoint(shape.center, anchor, angleRad),
      }
    case 'square': {
      const rotated = shape.vertices.map((v) => rotatePoint(v, anchor, angleRad))
      return {
        ...shape,
        vertices: rotated as [Point, Point, Point, Point],
      }
    }
    case 'triangle': {
      const rotated = shape.vertices.map((v) => rotatePoint(v, anchor, angleRad))
      return {
        ...shape,
        vertices: rotated as [Point, Point, Point],
      }
    }
    case 'arc': {
      // Two parts: move the center if the anchor isn't the center, AND shift
      // the start/end angles by the rotation delta.
      const angleDeg = (angleRad * 180) / Math.PI
      return {
        ...shape,
        center: rotatePoint(shape.center, anchor, angleRad),
        startAngle: shape.startAngle + angleDeg,
        endAngle: shape.endAngle + angleDeg,
      }
    }
    case 'composite':
      // Rotate every child around the same anchor.
      return {
        ...shape,
        children: shape.children.map((c) => rotateShape(c, anchor, angleRad)),
      }
  }
}

function cloneShape(shape: Shape): Shape {
  return JSON.parse(JSON.stringify(shape)) as Shape
}
