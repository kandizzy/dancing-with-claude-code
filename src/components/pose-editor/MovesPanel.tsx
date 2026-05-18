/**
 * Side-panel section for saved moves.
 *
 * UI structure:
 *   - List of moves at top with select / rename / delete
 *   - When a move is selected, an editor panel below it:
 *     - Start pose dropdown
 *     - Duration field
 *     - Loop toggle
 *     - Play / Pause / Restart buttons
 *     - Clip list with add / edit / delete
 *
 * First-cut UI: list view, not a visual timeline track. Drag-on-timeline
 * comes later.
 */

'use client'

import { useState } from 'react'
import { Plus, Trash2, Play, Pause, RotateCcw } from 'lucide-react'
import type { Move, MoveClip, Pose, Shape } from './types'
import { cn } from '@/lib/utils'

type MovesPanelProps = {
  poses: Pose[]
  sceneShapes: Shape[]
  moves: Move[]
  activeMoveId: string | null
  isPlaying: boolean
  currentTimeMs: number
  onCreateMove: (name: string, startPoseId: string) => Move
  onRenameMove: (id: string, name: string) => void
  onDeleteMove: (id: string) => void
  onUpdateMove: (id: string, patch: Partial<Move>) => void
  onSelectMove: (id: string | null) => void
  onAddClip: (moveId: string, clip: Omit<MoveClip, 'id'>) => MoveClip
  onUpdateClip: (moveId: string, clipId: string, patch: Partial<MoveClip>) => void
  onDeleteClip: (moveId: string, clipId: string) => void
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
}

export function MovesPanel(props: MovesPanelProps) {
  const {
    poses,
    sceneShapes,
    moves,
    activeMoveId,
    isPlaying,
    currentTimeMs,
    onCreateMove,
    onRenameMove,
    onDeleteMove,
    onUpdateMove,
    onSelectMove,
    onAddClip,
    onUpdateClip,
    onDeleteClip,
    onPlay,
    onPause,
    onRestart,
  } = props

  const activeMove = moves.find((m) => m.id === activeMoveId) ?? null
  const [creatingName, setCreatingName] = useState<string | null>(null)

  // Flat list of all shapes (top-level + composite children) for the clip
  // editor's "target shape" dropdown.
  const allShapes = flattenShapes(sceneShapes)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
          Moves
        </h2>
        <button
          type="button"
          onClick={() => {
            if (poses.length === 0) {
              alert('Save at least one pose first \u2014 a move needs a starting pose.')
              return
            }
            setCreatingName('')
          }}
          className="flex items-center gap-1 rounded border border-[var(--color-border-subtle)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover)]"
          title="Create a new move"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
      </div>

      {/* Create new move row */}
      {creatingName != null && (
        <div className="flex flex-col gap-1.5 rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] p-2">
          <input
            autoFocus
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            placeholder="Move name\u2026"
            className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = creatingName.trim()
                if (name && poses[0]) {
                  const newMove = onCreateMove(name, poses[0].id)
                  onSelectMove(newMove.id)
                }
                setCreatingName(null)
              }
              if (e.key === 'Escape') setCreatingName(null)
            }}
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setCreatingName(null)}
              className="rounded px-2 py-0.5 text-xs text-[var(--color-text-tertiary)] hover:bg-[var(--color-state-hover)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const name = creatingName.trim()
                if (name && poses[0]) {
                  const newMove = onCreateMove(name, poses[0].id)
                  onSelectMove(newMove.id)
                }
                setCreatingName(null)
              }}
              className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-xs text-white"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Moves list */}
      {moves.length === 0 && creatingName == null ? (
        <p className="text-xs italic text-[var(--color-text-tertiary)]">
          No moves yet. Save some poses, then create a move to animate between them.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {moves.map((move) => (
            <li key={move.id}>
              <button
                type="button"
                onClick={() => onSelectMove(move.id === activeMoveId ? null : move.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm',
                  'hover:bg-[var(--color-state-hover)]',
                  move.id === activeMoveId &&
                    'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
                )}
              >
                <span className="truncate">{move.name}</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">
                  {move.clips.length} clip{move.clips.length === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Active move editor */}
      {activeMove && (
        <MoveEditor
          move={activeMove}
          poses={poses}
          allShapes={allShapes}
          isPlaying={isPlaying}
          currentTimeMs={currentTimeMs}
          onRename={(name) => onRenameMove(activeMove.id, name)}
          onDelete={() => {
            if (window.confirm(`Delete move \"${activeMove.name}\"?`)) {
              onDeleteMove(activeMove.id)
              onSelectMove(null)
            }
          }}
          onUpdate={(patch) => onUpdateMove(activeMove.id, patch)}
          onAddClip={(clip) => onAddClip(activeMove.id, clip)}
          onUpdateClip={(clipId, patch) =>
            onUpdateClip(activeMove.id, clipId, patch)
          }
          onDeleteClip={(clipId) => onDeleteClip(activeMove.id, clipId)}
          onPlay={onPlay}
          onPause={onPause}
          onRestart={onRestart}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// MoveEditor \u2014 displays and edits the active move.
// ---------------------------------------------------------------------------

function MoveEditor({
  move,
  poses,
  allShapes,
  isPlaying,
  currentTimeMs,
  onRename,
  onDelete,
  onUpdate,
  onAddClip,
  onUpdateClip,
  onDeleteClip,
  onPlay,
  onPause,
  onRestart,
}: {
  move: Move
  poses: Pose[]
  allShapes: Shape[]
  isPlaying: boolean
  currentTimeMs: number
  onRename: (name: string) => void
  onDelete: () => void
  onUpdate: (patch: Partial<Move>) => void
  onAddClip: (clip: Omit<MoveClip, 'id'>) => MoveClip
  onUpdateClip: (clipId: string, patch: Partial<MoveClip>) => void
  onDeleteClip: (clipId: string) => void
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] p-2">
      {/* Name */}
      <input
        value={move.name}
        onChange={(e) => onRename(e.target.value)}
        className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
      />

      {/* Start pose */}
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--color-text-tertiary)]">Start pose</span>
        <select
          value={move.startPoseId}
          onChange={(e) => onUpdate({ startPoseId: e.target.value })}
          className="flex-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-1 py-0.5 text-xs"
        >
          {poses.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {/* Duration */}
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--color-text-tertiary)]">Duration (ms)</span>
        <input
          type="number"
          min={100}
          step={100}
          value={move.durationMs}
          onChange={(e) =>
            onUpdate({ durationMs: Math.max(100, Number(e.target.value) || 0) })
          }
          className="w-20 rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-1 py-0.5 text-xs"
        />
      </label>

      {/* Loop */}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={move.loop}
          onChange={(e) => onUpdate({ loop: e.target.checked })}
        />
        <span>Loop</span>
      </label>

      {/* Playhead */}
      <div className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
        t = {currentTimeMs.toFixed(0)}ms / {move.durationMs}ms
      </div>

      {/* Play controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className="flex items-center gap-1 rounded bg-[var(--color-accent)] px-2 py-1 text-xs text-white"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3 w-3" /> Pause
            </>
          ) : (
            <>
              <Play className="h-3 w-3" /> Play
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="rounded border border-[var(--color-border-subtle)] px-2 py-1 text-xs"
          title="Restart"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-state-hover)] hover:text-[var(--color-accent)]"
            title="Delete move"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Clips */}
      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">
            Clips
          </span>
          <button
            type="button"
            onClick={() => {
              if (allShapes.length === 0 || poses.length === 0) return
              onAddClip({
                shapeId: allShapes[0].id,
                targetPoseId: poses[0].id,
                startMs: 0,
                durationMs: 400,
                easing: 'linear',
              })
            }}
            className="flex items-center gap-0.5 rounded border border-[var(--color-border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover)]"
          >
            <Plus className="h-2.5 w-2.5" />
            Add clip
          </button>
        </div>

        {move.clips.length === 0 ? (
          <p className="text-[10px] italic text-[var(--color-text-tertiary)]">
            No clips. Click \"Add clip\" to start animating.
          </p>
        ) : (
          move.clips.map((clip) => (
            <ClipEditor
              key={clip.id}
              clip={clip}
              poses={poses}
              allShapes={allShapes}
              onUpdate={(patch) => onUpdateClip(clip.id, patch)}
              onDelete={() => onDeleteClip(clip.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClipEditor \u2014 inline editor for one clip.
// ---------------------------------------------------------------------------

function ClipEditor({
  clip,
  poses,
  allShapes,
  onUpdate,
  onDelete,
}: {
  clip: MoveClip
  poses: Pose[]
  allShapes: Shape[]
  onUpdate: (patch: Partial<MoveClip>) => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col gap-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] p-1.5">
      {/* Shape */}
      <select
        value={clip.shapeId}
        onChange={(e) => onUpdate({ shapeId: e.target.value })}
        className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-1 py-0.5 text-[11px]"
      >
        {allShapes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Target pose */}
      <select
        value={clip.targetPoseId}
        onChange={(e) => onUpdate({ targetPoseId: e.target.value })}
        className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-1 py-0.5 text-[11px]"
      >
        {poses.map((p) => (
          <option key={p.id} value={p.id}>
            \u2192 {p.name}
          </option>
        ))}
      </select>

      {/* Timing + easing in one row */}
      <div className="flex items-center gap-1 text-[10px]">
        <label className="flex flex-1 items-center gap-1">
          <span className="text-[var(--color-text-tertiary)]">start</span>
          <input
            type="number"
            min={0}
            step={50}
            value={clip.startMs}
            onChange={(e) =>
              onUpdate({ startMs: Math.max(0, Number(e.target.value) || 0) })
            }
            className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-1 py-0.5"
          />
        </label>
        <label className="flex flex-1 items-center gap-1">
          <span className="text-[var(--color-text-tertiary)]">dur</span>
          <input
            type="number"
            min={0}
            step={50}
            value={clip.durationMs}
            onChange={(e) =>
              onUpdate({ durationMs: Math.max(0, Number(e.target.value) || 0) })
            }
            className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-1 py-0.5"
          />
        </label>
      </div>

      <div className="flex items-center gap-1">
        <select
          value={clip.easing}
          onChange={(e) =>
            onUpdate({ easing: e.target.value as MoveClip['easing'] })
          }
          className="flex-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-1 py-0.5 text-[10px]"
        >
          <option value="linear">linear</option>
          <option value="ease-in-out">ease</option>
          <option value="snap">snap</option>
        </select>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-state-hover)] hover:text-[var(--color-accent)]"
          title="Delete clip"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  )
}

// Flatten composite children into a single list (for clip target dropdowns).
function flattenShapes(shapes: Shape[]): Shape[] {
  const out: Shape[] = []
  for (const s of shapes) {
    out.push(s)
    if (s.kind === 'composite') out.push(...flattenShapes(s.children))
  }
  return out
}
