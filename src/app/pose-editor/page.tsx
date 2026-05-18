/**
 * Pose editor route — standalone tool for editing Bauhaus dancer poses.
 *
 * Architecture: shape-first data model. The dancer is a `Scene` of geometric
 * primitives (circles, squares, triangles, arcs, composites). The editor renders
 * the scene as SVG and exposes draggable vertex handles when a shape is selected.
 *
 * Phase 0: route exists, scaffold visible.
 * Phase 1: render the dancer from scene data.
 * Phase 2+: add selection and vertex dragging.
 */

import { PoseEditor } from '@/components/pose-editor/PoseEditor'

export default function PoseEditorPage() {
  return <PoseEditor />
}
