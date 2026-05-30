/**
 * Top-level pose editor component.
 *
 * Phase 1: scene renders, side panel shows shape list.
 * Phase 2: selection — click a shape on canvas or in the panel to select it.
 * Phase 3: vertex handles — drag the selected shape's vertices to reshape it.
 * Phase 3.1: undo / redo + localStorage persistence of current scene.
 * Phase 3.2: rotation control — anchor and rotation handles per shape.
 * Phase 4: named poses — save / load / rename / delete.
 * Phase 5: moves — per-shape animation timelines built from poses. Playback
 *          overrides the live scene so the dancer animates; editing is
 *          disabled while playing.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, Undo2, Redo2, Move, RotateCw } from 'lucide-react'
import { DANCER_SCENE } from './dancer-scene'
import { SceneRenderer } from './SceneRenderer'
import { useSceneHistory } from './useSceneHistory'
import { useSavedPoses } from './useSavedPoses'
import { useSavedMoves } from './useSavedMoves'
import { useMovePlayback } from './useMovePlayback'
import { computeMoveSnapshot } from './move-engine'
import { PosePanel } from './PosePanel'
import { MovesPanel } from './MovesPanel'
import type { Pose, Shape } from './types'
import { cn } from '@/lib/utils'

export function PoseEditor() {
  const {
    scene,
    pushHistory,
    updateScene,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSceneHistory(DANCER_SCENE)
  const { poses, savePose, renamePose, deletePose, updatePose } = useSavedPoses()
  const {
    moves,
    createMove,
    renameMove,
    deleteMove,
    updateMove,
    addClip,
    updateClip,
    deleteClip,
  } = useSavedMoves()

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [activePoseId, setActivePoseId] = useState<string | null>(null)
  const [activeMoveId, setActiveMoveId] = useState<string | null>(null)
  // Editing mode: 'move' shows vertex/translate handles, 'rotate' shows the
  // rotation anchor + handle. Toggleable to avoid overlapping hit areas.
  const [editMode, setEditMode] = useState<'move' | 'rotate'>('move')

  const activeMove = useMemo(
    () => moves.find((m) => m.id === activeMoveId) ?? null,
    [moves, activeMoveId],
  )
  const startPose = useMemo(
    () => poses.find((p) => p.id === activeMove?.startPoseId) ?? null,
    [poses, activeMove],
  )

  const { currentTimeMs, isPlaying, play, pause, restart } = useMovePlayback(activeMove)

  // The rendered scene: either the live scene (editing) or a computed snapshot
  // from the move at the current playhead time (playing).
  const renderedScene = useMemo(() => {
    if (isPlaying && activeMove && startPose) {
      return computeMoveSnapshot(scene, activeMove, startPose, poses, currentTimeMs)
    }
    return scene
  }, [isPlaying, activeMove, startPose, poses, currentTimeMs, scene])

  // Replace a shape (by id) anywhere in the scene tree. Edits clear the
  // active-pose flag since we've diverged.
  const updateShape = useCallback(
    (next: Shape) => {
      updateScene((prev) => ({
        ...prev,
        shapes: replaceShape(prev.shapes, next),
      }))
      setActivePoseId(null)
    },
    [updateScene],
  )

  const resetToDefault = useCallback(() => {
    pushHistory()
    updateScene(DANCER_SCENE)
    setSelectedShapeId(null)
    setActivePoseId(null)
  }, [pushHistory, updateScene])

  const handleSavePose = useCallback(
    (name: string, shapes: Shape[]) => {
      const newPose = savePose(name, shapes)
      setActivePoseId(newPose.id)
      return newPose
    },
    [savePose],
  )

  const handleLoadPose = useCallback(
    (pose: Pose) => {
      pushHistory()
      updateScene((prev) => ({ ...prev, shapes: pose.shapes }))
      setActivePoseId(pose.id)
      setSelectedShapeId(null)
    },
    [pushHistory, updateScene],
  )

  const handleUpdatePose = useCallback(
    (id: string, shapes: Shape[]) => {
      updatePose(id, shapes)
      setActivePoseId(id)
    },
    [updatePose],
  )

  const handleDeletePose = useCallback(
    (id: string) => {
      deletePose(id)
      if (id === activePoseId) setActivePoseId(null)
    },
    [deletePose, activePoseId],
  )

  // Pause playback if user starts editing.
  useEffect(() => {
    if (isPlaying && selectedShapeId) pause()
  }, [selectedShapeId, isPlaying, pause])

  // Cmd-Z / Cmd-Shift-Z handlers, plus V/R for editing mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }
      const isMod = e.metaKey || e.ctrlKey
      if (isMod) {
        const key = e.key.toLowerCase()
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if ((key === 'z' && e.shiftKey) || key === 'y') {
          e.preventDefault()
          redo()
        }
        return
      }
      // V / R toggle the editing mode. No modifier required.
      const key = e.key.toLowerCase()
      if (key === 'v') {
        e.preventDefault()
        setEditMode('move')
      } else if (key === 'r') {
        e.preventDefault()
        setEditMode('rotate')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-page)] text-[var(--color-text-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-page)] px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-serif text-lg leading-tight tracking-tight">
            Pose editor
          </h1>
          <span className="text-[var(--color-text-tertiary)] font-serif text-sm italic">
            · {scene.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-text-tertiary)] italic">
            {isPlaying
              ? `playing — ${currentTimeMs.toFixed(0)}ms`
              : selectedShapeId
                ? `editing: ${findLabelById(scene.shapes, selectedShapeId) ?? selectedShapeId}`
                : activePoseId
                  ? `pose loaded`
                  : 'unsaved scene'}
          </span>

          {/* Mode toggle. V = move (drag vertices and translate),
             R = rotate (drag rotation handle around anchor). */}
          <div className="flex items-center gap-0.5 rounded border border-[var(--color-border-subtle)] p-0.5">
            <button
              type="button"
              onClick={() => setEditMode('move')}
              disabled={isPlaying}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 text-xs',
                editMode === 'move'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover)]',
              )}
              title="Move / deform mode (V)"
            >
              <Move className="h-3 w-3" />
              Move
            </button>
            <button
              type="button"
              onClick={() => setEditMode('rotate')}
              disabled={isPlaying}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 text-xs',
                editMode === 'rotate'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover)]',
              )}
              title="Rotate mode (R)"
            >
              <RotateCw className="h-3 w-3" />
              Rotate
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo || isPlaying}
              className="flex items-center gap-1 rounded border border-[var(--color-border-subtle)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              title="Undo (⌘Z)"
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo || isPlaying}
              className="flex items-center gap-1 rounded border border-[var(--color-border-subtle)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="h-3 w-3" />
              Redo
            </button>
          </div>

          <button
            type="button"
            onClick={resetToDefault}
            disabled={isPlaying}
            className="flex items-center gap-1.5 rounded border border-[var(--color-border-subtle)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            title="Reset to default pose"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[300px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-[var(--color-border-subtle)] bg-[var(--color-page)]/60 p-4">
          <section className="flex flex-col gap-2">
            <h2 className="font-serif text-xs uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
              Shapes
            </h2>
            <ul className="flex flex-col gap-1">
              {scene.shapes.map((shape) => (
                <ShapeListItem
                  key={shape.id}
                  shape={shape}
                  depth={0}
                  selectedShapeId={selectedShapeId}
                  onSelect={setSelectedShapeId}
                />
              ))}
            </ul>
          </section>

          <PosePanel
            poses={poses}
            currentSceneShapes={scene.shapes}
            sceneViewBox={{ width: scene.width, height: scene.height, name: scene.name }}
            activePoseId={activePoseId}
            onSavePose={handleSavePose}
            onLoadPose={handleLoadPose}
            onRenamePose={renamePose}
            onDeletePose={handleDeletePose}
            onUpdatePose={handleUpdatePose}
          />

          <MovesPanel
            poses={poses}
            sceneShapes={scene.shapes}
            moves={moves}
            activeMoveId={activeMoveId}
            isPlaying={isPlaying}
            currentTimeMs={currentTimeMs}
            onCreateMove={createMove}
            onRenameMove={renameMove}
            onDeleteMove={deleteMove}
            onUpdateMove={updateMove}
            onSelectMove={setActiveMoveId}
            onAddClip={addClip}
            onUpdateClip={updateClip}
            onDeleteClip={deleteClip}
            onPlay={() => {
              // Load start pose into scene before playing so the live scene is
              // a clean starting point. The renderer will still use the
              // computed snapshot during playback.
              if (startPose) {
                updateScene((prev) => ({ ...prev, shapes: startPose.shapes }))
                setSelectedShapeId(null)
              }
              play()
            }}
            onPause={pause}
            onRestart={restart}
          />
        </aside>

        <main className="flex min-w-0 flex-1 items-center justify-center overflow-auto p-8">
          <div className="border border-[var(--color-border-subtle)] bg-[var(--color-page)] p-6 shadow-sm">
            <SceneRenderer
              scene={renderedScene}
              className="h-[540px] w-auto"
              selectedShapeId={isPlaying ? null : selectedShapeId}
              onSelectShape={isPlaying ? undefined : setSelectedShapeId}
              onUpdateShape={isPlaying ? undefined : updateShape}
              onPushHistory={pushHistory}
              mode={editMode}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

function replaceShape(shapes: Shape[], next: Shape): Shape[] {
  return shapes.map((shape) => {
    if (shape.id === next.id) return next
    if (shape.kind === 'composite') {
      return { ...shape, children: replaceShape(shape.children, next) }
    }
    return shape
  })
}

function findLabelById(shapes: Shape[], id: string): string | null {
  for (const shape of shapes) {
    if (shape.id === id) return shape.label
    if (shape.kind === 'composite') {
      const inChildren = findLabelById(shape.children, id)
      if (inChildren) return inChildren
    }
  }
  return null
}

function ShapeListItem({
  shape,
  depth,
  selectedShapeId,
  onSelect,
}: {
  shape: Shape
  depth: number
  selectedShapeId: string | null
  onSelect: (id: string | null) => void
}) {
  const isSelected = shape.id === selectedShapeId
  const kindTag = `[${shape.kind}]`
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(isSelected ? null : shape.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm',
          'hover:bg-[var(--color-state-hover)]',
          isSelected && 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
          {kindTag}
        </span>
        <span>{shape.label}</span>
      </button>
      {shape.kind === 'composite' && (
        <ul className="flex flex-col gap-0.5">
          {shape.children.map((child) => (
            <ShapeListItem
              key={child.id}
              shape={child}
              depth={depth + 1}
              selectedShapeId={selectedShapeId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
