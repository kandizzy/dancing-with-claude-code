/**
 * Pointer-driven drag hook for SVG handles.
 *
 * Usage:
 *   const handleDown = useShapeDrag({
 *     svgRef,
 *     onDrag: (scenePoint) => updateShape(...),
 *   })
 *   <circle onPointerDown={handleDown} ... />
 *
 * What it does:
 *   - On pointerdown: captures the pointer so dragging continues even if it
 *     leaves the handle's bounds. Records the initial pointer position
 *     (translated into scene coords using the SVG's CTM).
 *   - On pointermove: translates the new pointer position into scene coords
 *     and invokes onDrag with that point.
 *   - On pointerup or pointercancel: releases the capture and stops listening.
 *
 * The math: SVG has its own coordinate system (the viewBox) that doesn't match
 * screen pixels 1:1. We use getScreenCTM().inverse() to convert screen
 * coordinates → SVG/scene coordinates. This is the standard SVG technique and
 * works correctly through transforms, CSS scaling, browser zoom, etc.
 */

'use client'

import { useCallback, useRef, type PointerEvent, type RefObject } from 'react'
import type { Point } from './types'

type UseShapeDragOptions = {
  /** Ref to the root SVG element. Used to compute scene-space coordinates. */
  svgRef: RefObject<SVGSVGElement | null>
  /** Called on every pointermove with the new scene-space pointer position. */
  onDrag: (scenePoint: Point) => void
  /** Optional callbacks for drag lifecycle. */
  onDragStart?: (scenePoint: Point) => void
  onDragEnd?: () => void
}

export function useShapeDrag({
  svgRef,
  onDrag,
  onDragStart,
  onDragEnd,
}: UseShapeDragOptions) {
  // Track whether we're actively dragging so move events outside the handle
  // can still update.
  const isDraggingRef = useRef(false)

  const screenToScene = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const svg = svgRef.current
      if (!svg) return null
      const screenCTM = svg.getScreenCTM()
      if (!screenCTM) return null
      const point = svg.createSVGPoint()
      point.x = clientX
      point.y = clientY
      const scenePoint = point.matrixTransform(screenCTM.inverse())
      return { x: scenePoint.x, y: scenePoint.y }
    },
    [svgRef],
  )

  const handlePointerDown = useCallback(
    (e: PointerEvent<SVGElement>) => {
      e.stopPropagation()
      const scenePoint = screenToScene(e.clientX, e.clientY)
      if (!scenePoint) return
      isDraggingRef.current = true
      // Capture the pointer: subsequent move/up events are routed to this
      // element even if the cursor leaves it. Critical for smooth dragging.
      ;(e.target as Element).setPointerCapture(e.pointerId)
      onDragStart?.(scenePoint)
    },
    [onDragStart, screenToScene],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent<SVGElement>) => {
      if (!isDraggingRef.current) return
      e.stopPropagation()
      const scenePoint = screenToScene(e.clientX, e.clientY)
      if (!scenePoint) return
      onDrag(scenePoint)
    },
    [onDrag, screenToScene],
  )

  const handlePointerUp = useCallback(
    (e: PointerEvent<SVGElement>) => {
      if (!isDraggingRef.current) return
      e.stopPropagation()
      isDraggingRef.current = false
      ;(e.target as Element).releasePointerCapture(e.pointerId)
      onDragEnd?.()
    },
    [onDragEnd],
  )

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    // pointer capture also forwards cancellation events; release on cancel too.
    onPointerCancel: handlePointerUp,
  }
}
