'use client'

import { useRef, useState } from 'react'
import { Stage } from './Stage'
import { EASINGS, useRafLoop, type EasingFn } from '@/lib/anim'

const W = 720
const H = 220
const PAD_X = 40
const TRAVEL_MS = 1800
const HOLD_MS = 800
const CYCLE_MS = TRAVEL_MS + HOLD_MS

const LANES: Array<{ key: keyof typeof EASINGS; label: string; description: string }> = [
  { key: 'linear', label: 'linear', description: 'constant velocity — robotic, no breath' },
  { key: 'easeInQuad', label: 'easeInQuad', description: 'accelerates — the figure flings forward' },
  { key: 'easeOutCubic', label: 'easeOutCubic', description: 'decelerates — radar default' },
  { key: 'easeInOutCubic', label: 'easeInOutCubic', description: 'symmetric — a balanced phrase' },
  { key: 'easeOutBack', label: 'easeOutBack', description: 'overshoots — held breath, then lands' },
]

const LANE_HEIGHT = H / LANES.length
const TRIANGLE_SIZE = 14

export function EasingShowcase() {
  const groupRefs = useRef<Array<SVGGElement | null>>([])
  const [activeEasing, setActiveEasing] = useState<keyof typeof EASINGS | null>(null)

  useRafLoop((elapsed) => {
    const slot = elapsed % CYCLE_MS
    // Only the travel phase animates; the hold phase pauses at the destination
    // so the eye can compare resting positions. Echoes Schlemmer's grid poses.
    const rawT = Math.min(slot / TRAVEL_MS, 1)

    for (let i = 0; i < LANES.length; i++) {
      const node = groupRefs.current[i]
      if (!node) continue
      const lane = LANES[i]
      const ease: EasingFn = EASINGS[lane.key]
      const eased = ease(rawT)
      const x = PAD_X + eased * (W - PAD_X * 2)
      const y = LANE_HEIGHT * (i + 0.5)
      // Triangles rotate as they travel to emphasize the velocity profile —
      // fast sections show motion blur in the eye even without filters.
      const rotation = eased * 360
      node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotation.toFixed(2)})`)
    }
  })

  return (
    <Stage
      title="Easing studio"
      caption="Five lanes, one triangle, five easings — same start and end, different phrasing"
      grid
    >
      <div className="grid grid-cols-[1fr_240px] gap-4 p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Easing comparison">
          {LANES.map((lane, i) => {
            const y = LANE_HEIGHT * (i + 0.5)
            const isActive = activeEasing === null || activeEasing === lane.key
            return (
              <g key={lane.key} opacity={isActive ? 1 : 0.18}>
                {/* Lane rail */}
                <line
                  x1={PAD_X}
                  x2={W - PAD_X}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                {/* Start marker */}
                <circle cx={PAD_X} cy={y} r={2.5} fill="rgba(255,255,255,0.4)" />
                {/* End marker */}
                <circle cx={W - PAD_X} cy={y} r={2.5} fill="rgba(255,255,255,0.4)" />
                {/* Traveling triangle */}
                <g ref={(el) => { groupRefs.current[i] = el }}>
                  <polygon
                    points={`0,${-TRIANGLE_SIZE} ${TRIANGLE_SIZE * 0.866},${TRIANGLE_SIZE * 0.5} ${-TRIANGLE_SIZE * 0.866},${TRIANGLE_SIZE * 0.5}`}
                    fill="var(--color-secondary)"
                    stroke="var(--color-secondary-strong)"
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            )
          })}
        </svg>
        <ul className="flex flex-col gap-1 text-xs">
          {LANES.map((lane) => {
            const active = activeEasing === lane.key
            return (
              <li key={lane.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveEasing(lane.key)}
                  onMouseLeave={() => setActiveEasing(null)}
                  onFocus={() => setActiveEasing(lane.key)}
                  onBlur={() => setActiveEasing(null)}
                  className={`block w-full rounded-sm border px-2 py-1.5 text-left transition-colors ${
                    active
                      ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/15'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <span className="font-mono text-[11px] text-[var(--color-paper)]">{lane.label}</span>
                  <span className="block text-[10px] leading-snug text-[var(--color-paper)]/55">
                    {lane.description}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Stage>
  )
}
