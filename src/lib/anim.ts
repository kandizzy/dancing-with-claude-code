// Animation primitives carried over from the radar work in `possible-futures`.
// One requestAnimationFrame loop drives every moving element in an experiment;
// refs let us mutate SVG attributes without re-rendering React.
//
// Pattern when composing an experiment:
//   const stageRef = useRef<SVGGElement>(null)
//   useRafLoop((elapsed) => {
//     const t = (elapsed % CYCLE_MS) / CYCLE_MS
//     stageRef.current?.setAttribute('transform', `rotate(${t * 360})`)
//   })

import { useEffect, useRef, useState } from 'react'

// --- Easing -----------------------------------------------------------------

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// Slight overshoot — feels like a held breath before the figure lands.
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export const easeInQuad = (t: number): number => t * t

export const linear = (t: number): number => t

export type EasingFn = (t: number) => number

export const EASINGS: Record<string, EasingFn> = {
  linear,
  easeInQuad,
  easeOutCubic,
  easeInOutCubic,
  easeOutBack,
}

// --- Math -------------------------------------------------------------------

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const lerpPoints = (
  from: ReadonlyArray<readonly [number, number]>,
  to: ReadonlyArray<readonly [number, number]>,
  t: number,
): Array<[number, number]> =>
  from.map(([fx, fy], i) => {
    const [tx, ty] = to[i] ?? [fx, fy]
    return [lerp(fx, tx, t), lerp(fy, ty, t)]
  })

// Polar → Cartesian. theta in radians, 0 = right, π/2 = down (SVG y-axis).
export const polar = (
  cx: number,
  cy: number,
  r: number,
  theta: number,
): [number, number] => [cx + r * Math.cos(theta), cy + r * Math.sin(theta)]

export const pointsToString = (pts: ReadonlyArray<readonly [number, number]>): string =>
  pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

// --- Hooks ------------------------------------------------------------------

/**
 * Drives a single rAF loop. Callback receives elapsed ms since mount. Returns
 * nothing — mutate refs inside. Pauses + zero-ticks if the user has
 * `prefers-reduced-motion` set (callback still fires once with elapsed = 0
 * so the experiment can render a static final state).
 */
export function useRafLoop(callback: (elapsed: number) => void): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) {
      callbackRef.current(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = () => {
      callbackRef.current(performance.now() - start)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
