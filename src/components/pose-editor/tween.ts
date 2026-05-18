/**
 * Tween a shape between two states at progress t in [0, 1].
 *
 * Per shape kind, we interpolate the right primitive values:
 *   - Circle: center (point), radius (number)
 *   - Square / Triangle: each vertex (point)
 *   - Arc: center (point), radius (number), startAngle, endAngle (numbers,
 *          with wrap-around handling so going 350\u00b0 \u2192 10\u00b0 takes the short way)
 *   - Composite: recurse into children
 *   - Anchor (where present): interpolate as a point
 *
 * The two shapes must be the same kind. If they aren't (which shouldn't\n * happen as long as ids are consistent), we return `from` unchanged.\n */

import type { Point, Shape } from './types'

type Easing = 'linear' | 'ease-in-out' | 'snap'

/** Apply easing to progress in [0, 1]. 'snap' returns 0 until t >= 1, then 1
 *  (instant transitions). 'linear' is identity. 'ease-in-out' is a smooth
 *  S-curve. */
export function applyEasing(t: number, easing: Easing): number {
  if (easing === 'snap') return t >= 1 ? 1 : 0
  if (easing === 'linear') return clamp01(t)
  // ease-in-out: 3t\u00b2 - 2t\u00b3 (smoothstep)
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

/** Interpolate two angles (in degrees) the short way around the circle. */
function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a
  // Normalize delta to [-180, 180] so we take the short path.
  while (delta > 180) delta -= 360
  while (delta < -180) delta += 360
  return a + delta * t
}

/** Interpolate two shapes at progress t (already eased). */
export function tweenShape(from: Shape, to: Shape, t: number): Shape {
  if (from.kind !== to.kind) return from
  if (from.id !== to.id) return from

  switch (from.kind) {
    case 'circle': {
      const toC = to as Extract<Shape, { kind: 'circle' }>
      return {
        ...from,
        center: lerpPoint(from.center, toC.center, t),
        radius: lerp(from.radius, toC.radius, t),
        anchor:
          from.anchor && toC.anchor ? lerpPoint(from.anchor, toC.anchor, t) : from.anchor,
      }
    }
    case 'square': {
      const toS = to as Extract<Shape, { kind: 'square' }>
      const vertices = from.vertices.map((v, i) =>
        lerpPoint(v, toS.vertices[i], t),
      ) as [Point, Point, Point, Point]
      return {
        ...from,
        vertices,
        anchor:
          from.anchor && toS.anchor ? lerpPoint(from.anchor, toS.anchor, t) : from.anchor,
      }
    }
    case 'triangle': {
      const toT = to as Extract<Shape, { kind: 'triangle' }>
      const vertices = from.vertices.map((v, i) =>
        lerpPoint(v, toT.vertices[i], t),
      ) as [Point, Point, Point]
      return {
        ...from,
        vertices,
        anchor:
          from.anchor && toT.anchor ? lerpPoint(from.anchor, toT.anchor, t) : from.anchor,
      }
    }
    case 'arc': {
      const toA = to as Extract<Shape, { kind: 'arc' }>
      return {
        ...from,
        center: lerpPoint(from.center, toA.center, t),
        radius: lerp(from.radius, toA.radius, t),
        startAngle: lerpAngle(from.startAngle, toA.startAngle, t),
        endAngle: lerpAngle(from.endAngle, toA.endAngle, t),
        anchor:
          from.anchor && toA.anchor ? lerpPoint(from.anchor, toA.anchor, t) : from.anchor,
      }
    }
    case 'composite': {
      const toCo = to as Extract<Shape, { kind: 'composite' }>
      // Match children by id; if a child exists in from but not to (or vice
      // versa), keep from.
      const children = from.children.map((fromChild) => {
        const toChild = toCo.children.find((c) => c.id === fromChild.id)
        return toChild ? tweenShape(fromChild, toChild, t) : fromChild
      })
      return {
        ...from,
        children,
        anchor: lerpPoint(from.anchor, toCo.anchor, t),
        rotation:
          from.rotation != null && toCo.rotation != null
            ? lerp(from.rotation, toCo.rotation, t)
            : from.rotation,
      }
    }
  }
}
