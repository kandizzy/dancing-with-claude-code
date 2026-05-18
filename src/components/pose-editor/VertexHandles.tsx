/**
 * Draggable handles for the selected shape's vertices / control points.
 *
 * Handle sets per shape kind:
 *   - Triangle: 3 vertex handles + 1 center handle (translate whole shape)
 *   - Square:   4 vertex handles + 1 center handle
 *   - Circle:   2 handles — center (translate) and radius
 *   - Arc:      3 handles — center (translate), start endpoint, end endpoint
 *   - Composite: no handles; drill into children via the side panel
 *
 * Every handle pushes a history snapshot on drag-start. Combined with the
 * useSceneHistory hook in PoseEditor, this gives one undo step per drag
 * gesture (rather than per pointermove, which would be far too granular).
 */

'use client'

import { useRef, type RefObject } from 'react'
import { useShapeDrag } from './useShapeDrag'
import type { Point, Shape } from './types'

type VertexHandlesProps = {
  shape: Shape
  svgRef: RefObject<SVGSVGElement | null>
  onUpdate: (next: Shape) => void
  /** Called at drag-start so the parent can push the pre-drag scene onto the
   *  undo stack. */
  onPushHistory: () => void
}

export function VertexHandles({
  shape,
  svgRef,
  onUpdate,
  onPushHistory,
}: VertexHandlesProps) {
  switch (shape.kind) {
    case 'triangle':
    case 'square':
      return (
        <PolygonHandles
          shape={shape}
          svgRef={svgRef}
          onUpdate={onUpdate}
          onPushHistory={onPushHistory}
        />
      )

    case 'circle': {
      const radiusPoint: Point = {
        x: shape.center.x,
        y: shape.center.y - shape.radius,
      }
      return (
        <>
          <Handle
            point={shape.center}
            svgRef={svgRef}
            variant="primary"
            onDragStart={onPushHistory}
            onDrag={(p) => onUpdate({ ...shape, center: p })}
          />
          <Handle
            point={radiusPoint}
            svgRef={svgRef}
            onDragStart={onPushHistory}
            onDrag={(p) => {
              const dx = p.x - shape.center.x
              const dy = p.y - shape.center.y
              const radius = Math.max(2, Math.sqrt(dx * dx + dy * dy))
              onUpdate({ ...shape, radius })
            }}
          />
        </>
      )
    }

    case 'arc':
      return (
        <ArcHandles
          shape={shape}
          svgRef={svgRef}
          onUpdate={onUpdate}
          onPushHistory={onPushHistory}
        />
      )

    case 'composite':
      return null
  }
}

// ---------------------------------------------------------------------------
// PolygonHandles — square / triangle. Vertex handles plus a center handle
// that translates the whole polygon rigidly.
// ---------------------------------------------------------------------------

function PolygonHandles({
  shape,
  svgRef,
  onUpdate,
  onPushHistory,
}: {
  shape: Extract<Shape, { kind: 'triangle' | 'square' }>
  svgRef: RefObject<SVGSVGElement | null>
  onUpdate: (next: Shape) => void
  onPushHistory: () => void
}) {
  const center = centroidOf(shape.vertices)
  const dragStart = useRef<{ verticesAtStart: Point[]; pointAtStart: Point } | null>(null)

  return (
    <>
      {shape.vertices.map((v, i) => (
        <Handle
          key={`v-${i}`}
          point={v}
          svgRef={svgRef}
          onDragStart={onPushHistory}
          onDrag={(p) => {
            const nextVertices = [...shape.vertices] as typeof shape.vertices
            nextVertices[i] = p
            onUpdate({ ...shape, vertices: nextVertices } as typeof shape)
          }}
        />
      ))}

      <Handle
        point={center}
        svgRef={svgRef}
        variant="primary"
        onDragStart={(p) => {
          onPushHistory()
          dragStart.current = {
            verticesAtStart: shape.vertices.map((v) => ({ ...v })),
            pointAtStart: p,
          }
        }}
        onDrag={(p) => {
          const start = dragStart.current
          if (!start) return
          const dx = p.x - start.pointAtStart.x
          const dy = p.y - start.pointAtStart.y
          const nextVertices = start.verticesAtStart.map((v) => ({
            x: v.x + dx,
            y: v.y + dy,
          })) as typeof shape.vertices
          onUpdate({ ...shape, vertices: nextVertices } as typeof shape)
        }}
        onDragEnd={() => {
          dragStart.current = null
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// ArcHandles — center (translate), start endpoint, end endpoint.
// ---------------------------------------------------------------------------

function ArcHandles({
  shape,
  svgRef,
  onUpdate,
  onPushHistory,
}: {
  shape: Extract<Shape, { kind: 'arc' }>
  svgRef: RefObject<SVGSVGElement | null>
  onUpdate: (next: Shape) => void
  onPushHistory: () => void
}) {
  const startRad = (shape.startAngle * Math.PI) / 180
  const endRad = (shape.endAngle * Math.PI) / 180
  const startPoint: Point = {
    x: shape.center.x + shape.radius * Math.cos(startRad),
    y: shape.center.y + shape.radius * Math.sin(startRad),
  }
  const endPoint: Point = {
    x: shape.center.x + shape.radius * Math.cos(endRad),
    y: shape.center.y + shape.radius * Math.sin(endRad),
  }

  const dragStart = useRef<{ centerAtStart: Point; pointAtStart: Point } | null>(null)

  return (
    <>
      <Handle
        point={shape.center}
        svgRef={svgRef}
        variant="primary"
        onDragStart={(p) => {
          onPushHistory()
          dragStart.current = {
            centerAtStart: { ...shape.center },
            pointAtStart: p,
          }
        }}
        onDrag={(p) => {
          const start = dragStart.current
          if (!start) return
          const dx = p.x - start.pointAtStart.x
          const dy = p.y - start.pointAtStart.y
          onUpdate({
            ...shape,
            center: {
              x: start.centerAtStart.x + dx,
              y: start.centerAtStart.y + dy,
            },
          })
        }}
        onDragEnd={() => {
          dragStart.current = null
        }}
      />

      <Handle
        point={startPoint}
        svgRef={svgRef}
        onDragStart={onPushHistory}
        onDrag={(p) => {
          const dx = p.x - shape.center.x
          const dy = p.y - shape.center.y
          const newRadius = Math.max(2, Math.sqrt(dx * dx + dy * dy))
          const newStartAngle = (Math.atan2(dy, dx) * 180) / Math.PI
          onUpdate({ ...shape, radius: newRadius, startAngle: newStartAngle })
        }}
      />

      <Handle
        point={endPoint}
        svgRef={svgRef}
        onDragStart={onPushHistory}
        onDrag={(p) => {
          const dx = p.x - shape.center.x
          const dy = p.y - shape.center.y
          const newRadius = Math.max(2, Math.sqrt(dx * dx + dy * dy))
          const newEndAngle = (Math.atan2(dy, dx) * 180) / Math.PI
          onUpdate({ ...shape, radius: newRadius, endAngle: newEndAngle })
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Handle — a single draggable circle.
// ---------------------------------------------------------------------------

type HandleProps = {
  point: Point
  svgRef: RefObject<SVGSVGElement | null>
  onDrag: (p: Point) => void
  /** Called when the drag begins. The argument is the drag-start point in
   *  scene coords. For most handles you can ignore the argument; for handles
   *  that need to snapshot pre-drag state, this is where you do it. */
  onDragStart?: ((p: Point) => void) | (() => void)
  onDragEnd?: () => void
  variant?: 'primary' | 'default'
}

function Handle({
  point,
  svgRef,
  onDrag,
  onDragStart,
  onDragEnd,
  variant = 'default',
}: HandleProps) {
  const handlers = useShapeDrag({
    svgRef,
    onDrag,
    onDragStart: onDragStart as ((p: Point) => void) | undefined,
    onDragEnd,
  })
  const visibleRadius = 5
  const hitRadius = 10
  const accent = 'var(--color-accent)'
  return (
    <g {...handlers} style={{ cursor: 'grab' }}>
      <circle cx={point.x} cy={point.y} r={hitRadius} fill="transparent" />
      <circle
        cx={point.x}
        cy={point.y}
        r={visibleRadius}
        fill={variant === 'primary' ? accent : 'var(--color-page)'}
        stroke={accent}
        strokeWidth={1.5}
        pointerEvents="none"
      />
    </g>
  )
}

function centroidOf(vertices: readonly Point[]): Point {
  const n = vertices.length
  const x = vertices.reduce((sum, v) => sum + v.x, 0) / n
  const y = vertices.reduce((sum, v) => sum + v.y, 0) / n
  return { x, y }
}
