'use client'

import { useRef } from 'react'
import { Stage } from './Stage'
import { useRafLoop, easeInOutCubic } from '@/lib/anim'

const W = 720
const H = 300

const DISK_CYCLE_MS = 6000
const SNAP_HOLD_MS = 1400
const SNAP_DUR_MS = 280
const SNAP_CYCLE_MS = SNAP_HOLD_MS + SNAP_DUR_MS
const SNAP_STEPS = 6
const ANCHOR_CYCLE_MS = 3000

const INK = 'var(--color-stage)'
const PAPER = 'var(--color-page)'
const PENCIL = 'var(--color-text-tertiary)'

export function SpinningShowcase() {
  const diskRefs = useRef<Array<SVGGElement | null>>([])
  const snapRef = useRef<SVGGElement | null>(null)
  const anchorRefs = useRef<Array<SVGGElement | null>>([])

  useRafLoop((elapsed) => {
    // Concentric disks
    const diskT = (elapsed % DISK_CYCLE_MS) / DISK_CYCLE_MS
    const baseAngle = diskT * 360
    const rates = [1, 2, 3]
    rates.forEach((rate, i) => {
      const node = diskRefs.current[i]
      if (!node) return
      const sign = i % 2 === 0 ? 1 : -1
      node.setAttribute('transform', `rotate(${(baseAngle * rate * sign).toFixed(2)} 130 ${H / 2})`)
    })

    // Hold-then-snap
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
    snapRef.current?.setAttribute('transform', `rotate(${snapAngle.toFixed(2)} 360 ${H / 2})`)

    // Anchor demo
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
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Spinning experiments">
        <defs>
          <radialGradient id="disk-wash-1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="disk-wash-2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="disk-wash-3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Three "cells" — each experiment in its own pencil-ruled cell,
            like the choreographic score in IMG_6573. */}
        {[40, 280, 520].map((x, i) => (
          <rect
            key={i}
            x={x}
            y={36}
            width={200}
            height={H - 60}
            fill="transparent"
            stroke={PENCIL}
            strokeWidth={0.5}
            strokeDasharray="2 3"
          />
        ))}

        {/* --- Concentric disks --- */}
        <g>
          <text x={50} y={28} fill={PENCIL} className="font-mono text-[10px] uppercase tracking-widest">
            1 : 2 : 3
          </text>
          {/* Watercolor spotlight under the disks */}
          <circle cx={130} cy={H / 2} r={74} fill="url(#disk-wash-1)" />
          {[58, 40, 22].map((r, i) => (
            <g key={i} ref={(el) => { diskRefs.current[i] = el }}>
              <circle
                cx={130}
                cy={H / 2}
                r={r}
                fill="none"
                stroke={INK}
                strokeWidth={0.9}
              />
              <line
                x1={130}
                x2={130}
                y1={H / 2 - r}
                y2={H / 2 - r + 6}
                stroke="var(--color-accent-strong)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>

        {/* --- Hold-then-snap --- */}
        <g>
          <text x={290} y={28} fill={PENCIL} className="font-mono text-[10px] uppercase tracking-widest">
            hold · snap · hold
          </text>
          <circle cx={360} cy={H / 2} r={70} fill="url(#disk-wash-2)" />
          {Array.from({ length: SNAP_STEPS }).map((_, i) => {
            const a = (i * 360) / SNAP_STEPS - 90
            const rad = (a * Math.PI) / 180
            return (
              <circle
                key={i}
                cx={360 + 56 * Math.cos(rad)}
                cy={H / 2 + 56 * Math.sin(rad)}
                r={1.6}
                fill={PENCIL}
              />
            )
          })}
          <g ref={(el) => { snapRef.current = el }}>
            <polygon
              points="360,94 408,128 408,172 360,206 312,172 312,128"
              fill="var(--color-secondary)"
              fillOpacity={0.18}
              stroke={INK}
              strokeWidth={0.9}
            />
            <line
              x1={360}
              x2={360}
              y1={H / 2 - 56}
              y2={H / 2 - 48}
              stroke="var(--color-secondary-strong)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* --- Anchor demo --- */}
        <g>
          <text x={530} y={28} fill={PENCIL} className="font-mono text-[10px] uppercase tracking-widest">
            anchor choice
          </text>
          <circle cx={595} cy={H / 2} r={72} fill="url(#disk-wash-3)" />
          {(['centroid', 'vertex', 'off-axis'] as const).map((label, i) => {
            const cx = [560, 600, 620][i]
            return (
              <g key={label}>
                <circle cx={cx} cy={H / 2} r={1.8} fill={INK} />
                <g ref={(el) => { anchorRefs.current[i] = el }}>
                  <polygon
                    points={`580,${H / 2 - 22} 600,${H / 2 + 14} 560,${H / 2 + 14}`}
                    fill="none"
                    stroke={INK}
                    strokeWidth={0.85}
                    opacity={0.55}
                  />
                </g>
                <text
                  x={cx}
                  y={H - 18}
                  textAnchor="middle"
                  fill={PENCIL}
                  className="font-mono text-[9px] uppercase tracking-widest"
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
