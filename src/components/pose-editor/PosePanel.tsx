/**
 * Side-panel section for saved poses.
 *
 * Shows a list of named poses with thumbnail previews. Click a pose to load it
 * into the scene. Hovering a pose reveals rename and delete affordances.
 *
 * The "Save pose" button captures the current scene shapes and prompts for a
 * name.
 */

'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X, RotateCcw } from 'lucide-react'
import type { Pose, Scene, Shape } from './types'
import { SceneRenderer } from './SceneRenderer'
import { cn } from '@/lib/utils'

type PosePanelProps = {
  poses: Pose[]
  currentSceneShapes: Shape[]
  sceneViewBox: { width: number; height: number; name: string }
  /** Currently loaded pose id (so we can show which one is active). Null if
   *  the scene has been edited since loading, or has never been loaded. */
  activePoseId: string | null
  onSavePose: (name: string, shapes: Shape[]) => Pose
  onLoadPose: (pose: Pose) => void
  onRenamePose: (id: string, name: string) => void
  onDeletePose: (id: string) => void
  /** "Save as new" overwrites the currently active pose with the scene's
   *  current state. Useful for iterating on a pose without creating new
   *  entries. */
  onUpdatePose: (id: string, shapes: Shape[]) => void
}

export function PosePanel({
  poses,
  currentSceneShapes,
  sceneViewBox,
  activePoseId,
  onSavePose,
  onLoadPose,
  onRenamePose,
  onDeletePose,
  onUpdatePose,
}: PosePanelProps) {
  const [savingName, setSavingName] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const startSaving = () => setSavingName('')
  const cancelSaving = () => setSavingName(null)
  const commitSaving = () => {
    if (savingName == null) return
    const trimmed = savingName.trim()
    if (!trimmed) {
      cancelSaving()
      return
    }
    onSavePose(trimmed, currentSceneShapes)
    setSavingName(null)
  }

  const startRenaming = (pose: Pose) => {
    setRenamingId(pose.id)
    setRenameDraft(pose.name)
  }
  const cancelRenaming = () => {
    setRenamingId(null)
    setRenameDraft('')
  }
  const commitRenaming = () => {
    if (renamingId) onRenamePose(renamingId, renameDraft)
    cancelRenaming()
  }

  const confirmDelete = (pose: Pose) => {
    if (window.confirm(`Delete pose "${pose.name}"?`)) {
      onDeletePose(pose.id)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xs uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
          Poses
        </h2>
        <button
          type="button"
          onClick={startSaving}
          className="flex items-center gap-1 rounded border border-[var(--color-border-subtle)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover)]"
          title="Save current scene as a new pose"
        >
          <Plus className="h-3 w-3" />
          Save
        </button>
      </div>

      {/* Save-as input row */}
      {savingName != null && (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={savingName}
            onChange={(e) => setSavingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSaving()
              if (e.key === 'Escape') cancelSaving()
            }}
            placeholder="Pose name…"
            className="flex-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="button"
            onClick={commitSaving}
            className="rounded p-1 text-[var(--color-accent)] hover:bg-[var(--color-state-hover)]"
            title="Save"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={cancelSaving}
            className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-state-hover)]"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Pose list */}
      {poses.length === 0 && savingName == null ? (
        <p className="text-xs italic text-[var(--color-text-tertiary)]">
          No saved poses yet. Drag the dancer into a pose, then click Save.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {poses.map((pose) => {
            const isActive = pose.id === activePoseId
            const isRenaming = pose.id === renamingId
            return (
              <li key={pose.id}>
                <div
                  className={cn(
                    'group flex items-stretch gap-2 rounded border bg-[var(--color-page)] p-1.5',
                    isActive
                      ? 'border-[var(--color-accent)]'
                      : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border)]',
                  )}
                >
                  {/* Thumbnail (clickable to load) */}
                  <button
                    type="button"
                    onClick={() => onLoadPose(pose)}
                    className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--color-stage-bg)]/50"
                    title={`Load pose "${pose.name}"`}
                  >
                    <PoseThumbnail pose={pose} sceneViewBox={sceneViewBox} />
                  </button>

                  {/* Name + actions */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    {isRenaming ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRenaming()
                            if (e.key === 'Escape') cancelRenaming()
                          }}
                          className="min-w-0 flex-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-page)] px-1.5 py-0.5 text-xs outline-none focus:border-[var(--color-accent)]"
                        />
                        <button
                          type="button"
                          onClick={commitRenaming}
                          className="rounded p-0.5 text-[var(--color-accent)] hover:bg-[var(--color-state-hover)]"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRenaming}
                          className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-state-hover)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onLoadPose(pose)}
                        className="truncate text-left text-sm hover:text-[var(--color-accent)]"
                        title={`Load pose "${pose.name}"`}
                      >
                        {pose.name}
                      </button>
                    )}

                    {!isRenaming && (
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => onUpdatePose(pose.id, currentSceneShapes)}
                            className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-state-hover)]"
                            title="Update this pose with the current scene"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startRenaming(pose)}
                          className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-state-hover)]"
                          title="Rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(pose)}
                          className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-state-hover)] hover:text-[var(--color-accent)]"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Small thumbnail preview. Reuses SceneRenderer at a fixed small size, with
// selection/editing disabled (it's just an image).
// ---------------------------------------------------------------------------

function PoseThumbnail({
  pose,
  sceneViewBox,
}: {
  pose: Pose
  sceneViewBox: { width: number; height: number; name: string }
}) {
  const previewScene: Scene = {
    id: pose.id,
    name: pose.name,
    width: sceneViewBox.width,
    height: sceneViewBox.height,
    shapes: pose.shapes,
  }
  return <SceneRenderer scene={previewScene} className="h-full w-full" />
}
