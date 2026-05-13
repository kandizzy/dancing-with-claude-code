'use client'

import { useRef } from 'react'
import { Stage } from './Stage'
import { useRafLoop, easeInOutCubic } from '@/lib/anim'

const W = 720
const H = 280

// Concentric disks at 1:2:3 rates — phase-locked, returns to identity every
// LCM(1,2,3) = 6 full rotations of the slowest. Anchored to one center.
const DISK_CYCLE_MS = 6000

// Hold-then-snap rotation echoes Schlemmer's grid choreography: held pose,
// rapid transition, held pose. Easing only during the snap window.
const SNAP_HOLD_MS = 1400
const SNAP_DUR_MS = 280
const SNAP_CYCLE_MS = SNAP_HOLD_MS + SNAP_DUR_MS
const SNAP_STEPS = 6 // hexagonal — 60° per step

// Anchor demo: same triangle rotated around three different points so the
// user feels how anchor choice changes the gesture.
const ANCHOR_CYCLE_MS = 3000

export function SpinningShowcase() {
  const diskRefs = useRef<Array<SVGGElement | null>>([])
  const snapRef = useRef<SVGGElement | null>(null)
  const anchorRefs = useRef<Array<SVGGElement | null>>([])

  useRafLoop((elapsed) => {
    // --- Concentric disks ---
    const diskT = (elapsed % DISK_CYCLE_MS) / DISK_CYCLE_MS
    const baseAngle = diskT * 360
    const rates = [1, 2, 3]
    rates.forEach((rate, i) => {
      const node = diskRefs.current[i]
      if (!node) return
      // Counter-rotate every other ring to avoid the whole stack reading
      // as a single solid object — keeps each ring visually distinct.
      const sign = i % 2 === 0 ? 1 : -1
      node.setAttribute('transform', `rotate(${(baseAngle * rate * sign).toFixed(2)} 120 ${H / 2})`)
    })

    // --- Hold-then-snap ---
    const slot = elapsed % SNAP_CYCLE_MS
    const stepIdx = Math.floor(elapsed / SNAP_CYCLE_MS) % SNAP_STEPS
    const inSnap = slot >= SNAP_HOLD_MS
    const fromAngle = stepIdx * (360 / SNAP_STEPS)
    const toAngle = (stepIdx + 1) * (360 / SNAP_STEPS)
    let snapAngle: number
    if (inSnap) {
      const local = (slot - SNAP_HOLD_MS) / SNAP_DUR_MS
      snapAngle = fromAngle + easeInOutCubic(Math.min(local, 1)) * (toAngle - fromAngle)
    } else {
      snapAngle = fromAngle
    }
    if (snapRef.current) {
      snapRef.current.setAttribute('transform', `rotate(${snapAngle.toFixed(2)} 360 ${H / 2})`)
    }

    // --- Anchor demo: same triangle, three anchors ---
    const anchorT = (elapsed % ANCHOR_CYCLE_MS) / ANCHOR_CYCLE_MS
    const anchorAngle = anchorT * 360
    const anchors: Array<[number, number]> = [
      [560, H / 2], // centroid
      [600, H / 2 - 24], // top vertex
      [620, H / 2], // off-axis right
    ]
    anchors.forEach(([ax, ay], i) => {
      const node = anchorRefs.current[i]
      if (!node) return
      node.setAttribute('transform', `rotate(${anchorAngle.toFixed(2)} ${ax} ${ay})`)
    })
  })

  return (
    <Stage
      title="Spinning"
      caption="Phase-locked rates · hold-then-snap · anchor choice"
      grid
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Spinning experiments">
        {/* --- Concentric disks (left third) --- */}
        <g>
          <text x={20} y={28} className="fill-white/55 font-mono text-[10px] uppercase tracking-widest">
            1 : 2 : 3
          </text>
          {[64, 44, 24].map((r, i) => (
            <g key={i} ref={(el) => { diskRefs.current[i] = el }}>
              <circle
                cx={120}
                cy={H / 2}
                r={r}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                opacity={0.85}
              />
              {/* Tick mark so rotation is visible */}
              <line
                x1={120}
                x2={120}
                y1={H / 2 - r}
                y2={H / 2 - r + 8}
                stroke="var(--color-accent-strong)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>

        {/* --- Hold-then-snap hexagon (middle third) --- */}
        <g>
          <text x={300} y={28} className="fill-white/55 font-mono text-[10px] uppercase tracking-widest">
            hold · snap · hold
          </text>
          {/* Static reference outline shows the destination cells */}
          {Array.from({ length: SNAP_STEPS }).map((_, i) => {
            const a = (i * 360) / SNAP_STEPS
            const rad = (a * Math.PI) / 180
            return (
              <circle
                key={i}
                cx={360 + 56 * Math.cos(rad)}
                cy={H / 2 + 56 * Math.sin(rad)}
                r={2}
                fill="rgba(255,255,255,0.18)"
              />
            )
          })}
          <g ref={(el) => { snapRef.current = el }}>
            <polygon
              points="360,82 416,124 416,176 360,218 304,176 304,124"
              fill="none"
              stroke="var(--color-tertiary)"
              strokeWidth={2}
            />
            <line
              x1={360}
              x2={360}
              y1={H / 2 - 56}
              y2={H / 2 - 44}
              stroke="var(--color-tertiary)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* --- Anchor demo (right third) --- */}
        <g>
          <text x={550} y={28} className="fill-white/55 font-mono text-[10px] uppercase tracking-widest">
            anchor choice
          </text>
          {(['centroid', 'vertex', 'off-axis'] as const).map((label, i) => {
            const offsetY = i * 0 // single row, but each anchor offsets the same triangle
            const cx = [560, 600, 620][i]
            return (
              <g key={label}>
                {/* Anchor point indicator */}
                <circle cx={cx} cy={H / 2 + offsetY} r={2} fill="var(--color-paper)" />
                <g ref={(el) => { anchorRefs.current[i] = el }}>
                  <polygon
                    points={`580,${H / 2 - 24} 600,${H / 2 + 14} 560,${H / 2 + 14}`}
                    fill="none"
                    stroke="var(--color-secondary)"
                    strokeWidth={1.5}
                    opacity={0.55}
                  />
                </g>
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-white/45 font-mono text-[9px] uppercase tracking-widest"
                >
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </Stage>
  )
}
