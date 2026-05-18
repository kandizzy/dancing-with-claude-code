/**
 * Pure renderer for a Scene with optional selection and edit affordances.
 *
 * Phase 1: render scene shapes.
 * Phase 2: render selection overlay, dispatch click-to-select.
 * Phase 3: render draggable vertex handles for the selected shape.
 *
 * The renderer remains stateless; both selection state and the scene itself
 * live in the parent. We expose a forwarded ref to the SVG so the drag hook
 * can compute screen-to-scene coordinates correctly.
 */

'use client'

import { useRef } from 'react'
import { VertexHandles } from './VertexHandles'
import { RotationControls } from './RotationControls'
import type { Scene, Shape } from './types'

type SceneRendererProps = {
  scene: Scene
  className?: string
  /** ID of the currently selected shape, or null. */
  selectedShapeId?: string | null
  /** Called when a shape is clicked, or null when the background is clicked. */
  onSelectShape?: (shapeId: string | null) => void
  /** Called when a handle drag produces an updated shape. The parent should
   *  replace the shape with the same id in scene state. */
  onUpdateShape?: (next: Shape) => void
  /** Called at drag-start so the parent can push the pre-drag scene onto the
   *  undo stack. One snapshot per drag gesture, not per move event. */
  onPushHistory?: () => void
  /** Editing mode. 'move' shows vertex / translate handles. 'rotate' shows
   *  rotation anchor + handle. These can't be shown simultaneously because
   *  their hit areas overlap. */
  mode?: 'move' | 'rotate'
}

export function SceneRenderer({
  scene,
  className,
  selectedShapeId,
  onSelectShape,
  onUpdateShape,
  onPushHistory,
  mode = 'move',
}: SceneRendererProps) {
  const selectable = onSelectShape != null
  const editable = onUpdateShape != null
  const svgRef = useRef<SVGSVGElement | null>(null)

  const selectedShape = selectedShapeId
    ? findShapeById(scene.shapes, selectedShapeId)
    : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      className={className}
      role="img"
      aria-label={scene.name}
      onClick={() => selectable && onSelectShape?.(null)}
      style={{ cursor: selectable ? 'default' : undefined, touchAction: 'none' }}
    >
      <defs>
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

      <ellipse
        cx={180}
        cy={256}
        rx={228 / 2 + 6}
        ry={96 * 0.45}
        fill="url(#dancer-skirt-tile-wash)"
        pointerEvents="none"
      />

      {scene.shapes.map((shape) => (
        <ShapeNode
          key={shape.id}
          shape={shape}
          selectable={selectable}
          onSelectShape={onSelectShape}
        />
      ))}

      {/* Selection overlay (dashed bounding box) on top of all shapes. */}
      {selectedShape && <SelectionOverlay shape={selectedShape} />}

      {/* Edit affordances for the selected shape. Mode determines which set
         to show — they can't both render because their hit areas overlap. */}
      {editable && selectedShape && mode === 'move' && (
        <VertexHandles
          shape={selectedShape}
          svgRef={svgRef}
          onUpdate={onUpdateShape}
          onPushHistory={onPushHistory ?? (() => {})}
        />
      )}
      {editable && selectedShape && mode === 'rotate' && (
        <RotationControls
          shape={selectedShape}
          svgRef={svgRef}
          onUpdate={onUpdateShape}
          onPushHistory={onPushHistory ?? (() => {})}
        />
      )}
    </svg>
  )
}

function findShapeById(shapes: Shape[], id: string): Shape | null {
  for (const shape of shapes) {
    if (shape.id === id) return shape
    if (shape.kind === 'composite') {
      const inChildren = findShapeById(shape.children, id)
      if (inChildren) return inChildren
    }
  }
  return null
}

type ShapeNodeProps = {
  shape: Shape
  selectable: boolean
  onSelectShape?: (id: string | null) => void
}

function ShapeNode({ shape, selectable, onSelectShape }: ShapeNodeProps) {
  switch (shape.kind) {
    case 'circle':
      return (
        <CircleNode shape={shape} selectable={selectable} onSelectShape={onSelectShape} />
      )
    case 'square':
      return (
        <SquareNode shape={shape} selectable={selectable} onSelectShape={onSelectShape} />
      )
    case 'triangle':
      return (
        <TriangleNode shape={shape} selectable={selectable} onSelectShape={onSelectShape} />
      )
    case 'arc':
      return (
        <ArcNode shape={shape} selectable={selectable} onSelectShape={onSelectShape} />
      )
    case 'composite':
      return (
        <CompositeNode
          shape={shape}
          selectable={selectable}
          onSelectShape={onSelectShape}
        />
      )
  }
}

function wrap(
  body: React.ReactNode,
  shape: Shape,
  selectable: boolean,
  onSelectShape?: (id: string | null) => void,
) {
  const filterId = 'style' in shape ? shape.style.filterId : undefined
  const handleClick = selectable
    ? (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelectShape?.(shape.id)
      }
    : undefined
  const cursor = selectable ? 'pointer' : undefined

  return (
    <g
      filter={filterId ? `url(#${filterId})` : undefined}
      onClick={handleClick}
      style={{ cursor }}
    >
      {body}
    </g>
  )
}

function CircleNode({
  shape,
  selectable,
  onSelectShape,
}: {
  shape: Extract<Shape, { kind: 'circle' }>
  selectable: boolean
  onSelectShape?: (id: string | null) => void
}) {
  return wrap(
    <circle
      cx={shape.center.x}
      cy={shape.center.y}
      r={shape.radius}
      fill={shape.style.fill ?? 'none'}
      stroke={shape.style.stroke ?? 'none'}
      strokeWidth={shape.style.strokeWidth ?? 1}
    />,
    shape,
    selectable,
    onSelectShape,
  )
}

function SquareNode({
  shape,
  selectable,
  onSelectShape,
}: {
  shape: Extract<Shape, { kind: 'square' }>
  selectable: boolean
  onSelectShape?: (id: string | null) => void
}) {
  const points = shape.vertices.map((v) => `${v.x},${v.y}`).join(' ')
  return wrap(
    <polygon
      points={points}
      fill={shape.style.fill ?? 'none'}
      stroke={shape.style.stroke ?? 'none'}
      strokeWidth={shape.style.strokeWidth ?? 1}
      strokeLinejoin="round"
    />,
    shape,
    selectable,
    onSelectShape,
  )
}

function TriangleNode({
  shape,
  selectable,
  onSelectShape,
}: {
  shape: Extract<Shape, { kind: 'triangle' }>
  selectable: boolean
  onSelectShape?: (id: string | null) => void
}) {
  const points = shape.vertices.map((v) => `${v.x},${v.y}`).join(' ')
  return wrap(
    <polygon
      points={points}
      fill={shape.style.fill ?? 'none'}
      stroke={shape.style.stroke ?? 'none'}
      strokeWidth={shape.style.strokeWidth ?? 1}
      strokeLinejoin="round"
    />,
    shape,
    selectable,
    onSelectShape,
  )
}

function ArcNode({
  shape,
  selectable,
  onSelectShape,
}: {
  shape: Extract<Shape, { kind: 'arc' }>
  selectable: boolean
  onSelectShape?: (id: string | null) => void
}) {
  const startRad = (shape.startAngle * Math.PI) / 180
  const endRad = (shape.endAngle * Math.PI) / 180
  const startX = shape.center.x + shape.radius * Math.cos(startRad)
  const startY = shape.center.y + shape.radius * Math.sin(startRad)
  const endX = shape.center.x + shape.radius * Math.cos(endRad)
  const endY = shape.center.y + shape.radius * Math.sin(endRad)
  const angleSpan = Math.abs(shape.endAngle - shape.startAngle)
  const largeArc = angleSpan > 180 ? 1 : 0
  const sweep = shape.endAngle > shape.startAngle ? 1 : 0
  const d = `M ${startX} ${startY} A ${shape.radius} ${shape.radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`
  const visiblePath = (
    <path
      d={d}
      fill={shape.style.fill ?? 'none'}
      stroke={shape.style.stroke ?? 'none'}
      strokeWidth={shape.style.strokeWidth ?? 1}
      strokeLinecap="round"
    />
  )
  const hitArea = selectable ? (
    <path
      d={d}
      fill="none"
      stroke="transparent"
      strokeWidth={12}
      strokeLinecap="round"
    />
  ) : null
  return wrap(
    <>
      {hitArea}
      {visiblePath}
    </>,
    shape,
    selectable,
    onSelectShape,
  )
}

function CompositeNode({
  shape,
  selectable,
  onSelectShape,
}: {
  shape: Extract<Shape, { kind: 'composite' }>
  selectable: boolean
  onSelectShape?: (id: string | null) => void
}) {
  const transform =
    shape.rotation || shape.scale
      ? `translate(${shape.anchor.x} ${shape.anchor.y}) ${
          shape.rotation ? `rotate(${shape.rotation})` : ''
        } ${shape.scale ? `scale(${shape.scale.x} ${shape.scale.y})` : ''} translate(${-shape.anchor.x} ${-shape.anchor.y})`
      : undefined
  return (
    <g transform={transform}>
      {shape.children.map((child) => (
        <ShapeNode
          key={child.id}
          shape={child}
          selectable={selectable}
          onSelectShape={onSelectShape}
        />
      ))}
    </g>
  )
}

function SelectionOverlay({ shape }: { shape: Shape }) {
  const box = computeAABB(shape)
  if (!box) return null
  const padding = 4
  const ACCENT = 'var(--color-accent)'
  return (
    <rect
      x={box.x - padding}
      y={box.y - padding}
      width={box.width + padding * 2}
      height={box.height + padding * 2}
      fill="none"
      stroke={ACCENT}
      strokeWidth={1}
      strokeDasharray="4 3"
      pointerEvents="none"
    />
  )
}

function computeAABB(
  shape: Shape,
): { x: number; y: number; width: number; height: number } | null {
  switch (shape.kind) {
    case 'circle':
      return {
        x: shape.center.x - shape.radius,
        y: shape.center.y - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      }
    case 'square':
    case 'triangle': {
      const xs = shape.vertices.map((v) => v.x)
      const ys = shape.vertices.map((v) => v.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }
    case 'arc':
      return {
        x: shape.center.x - shape.radius,
        y: shape.center.y - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      }
    case 'composite': {
      const childBoxes = shape.children
        .map((c) => computeAABB(c))
        .filter((b): b is NonNullable<typeof b> => b != null)
      if (childBoxes.length === 0) return null
      const minX = Math.min(...childBoxes.map((b) => b.x))
      const minY = Math.min(...childBoxes.map((b) => b.y))
      const maxX = Math.max(...childBoxes.map((b) => b.x + b.width))
      const maxY = Math.max(...childBoxes.map((b) => b.y + b.height))
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }
  }
}
