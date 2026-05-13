---
description: Help the user sketch a new figure that fits this prototype's pattern, naming the files they'd touch.
---

The user wants to add a sixth figure (or replace an existing one) to this prototype. The prototype currently has five — see `src/lib/levels/level-1.ts` through `level-5.ts`.

To sketch a new figure, walk the user through:

1. **The Claude-Code capability** the figure would teach. It should be something a real user often misses, not theoretical. (Examples: memory updates with `# Remember:`; using `/init`; passing `--print`; running multiple `claude` instances; reading the diff before accepting.) Ask which capability the user wants to teach and why.

2. **The gate.** What user action would prove they exercised the capability? The existing five gates: fingerprint-match in a reply (F1), invoking a slash command (F2), composing a directive (F3), reviewing a tool proposal (F4), scoping a request (F5). The new gate should be of the same form — an authored act, not a delivered output.

3. **The artifact.** Browser-internal (like F1/F2/F4) or cross-surface paste-back (like F3/F5)? Same decision the prototype already makes.

4. **The shape.** The prototype uses circle / triangle / arc / square / composite. A sixth figure needs a sixth shape — name it.

5. **The files they'd touch.** At minimum:
   - `src/lib/levels/types.ts` — add the new id to `LevelId` and the new kind to `ShapeKind`
   - `src/lib/levels/level-N.ts` — new file with `LEVEL_N_EXTRA_SYSTEM` (if needed) and the `LevelDefinition`
   - `src/lib/levels/registry.ts` — register the level
   - `src/components/learn/Level{N}Workspace.tsx` — new workspace
   - `src/app/learn/[level]/page.tsx` — wire the new workspace into the dispatcher
   - `src/components/learn/Shape.tsx` — add the new shape geometry
   - `src/app/page.tsx` — add the new row to the figure list

Don't write the code yet. Sketch the figure, name the gate, then ask the user to confirm before you propose any edits.
