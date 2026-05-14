---
description: Sketch a new figure that fits this prototype's pattern. Pass the capability — e.g. /propose-new-figure teaching the # Remember syntax.
---

The user wants to add a sixth figure (or replace an existing one) to this prototype. The prototype currently has five — see `src/lib/figures/figure-1.ts` through `figure-5.ts`.

**Capability the user wants to teach:** $ARGUMENTS

If `$ARGUMENTS` is empty, ask the user what Claude Code capability the new figure should teach. Offer a few possibilities to spark ideas: the `# Remember:` memory syntax, `/init`, passing `--print`, running multiple `claude` instances, reading the diff before accepting. The user can answer with their pick on their next message — this conversation has memory.

Otherwise, walk the user through:

1. **The Claude-Code capability** the figure would teach. It should be something a real user often misses, not theoretical. (Examples: memory updates with `# Remember:`; using `/init`; passing `--print`; running multiple `claude` instances; reading the diff before accepting.) Ask which capability the user wants to teach and why.

2. **The gate.** What user action would prove they exercised the capability? The existing five gates: fingerprint-match in a reply (F1), invoking a slash command (F2), composing a directive (F3), reviewing a tool proposal (F4), scoping a request (F5). The new gate should be of the same form — an authored act, not a delivered output.

3. **The artifact.** Browser-internal (like F1/F2/F4) or cross-surface paste-back (like F3/F5)? Same decision the prototype already makes.

4. **The shape.** The prototype uses circle / triangle / arc / square / composite. A sixth figure needs a sixth shape — name it.

5. **The files they'd touch.** At minimum:
   - `src/lib/figures/types.ts` — add the new id to `FigureId` and the new kind to `ShapeKind`
   - `src/lib/figures/figure-N.ts` — new file with `FIGURE_N_EXTRA_SYSTEM` (if needed) and the `FigureDefinition`
   - `src/lib/figures/registry.ts` — register the figure
   - `src/components/learn/Figure{N}Workspace.tsx` — new workspace
   - `src/app/learn/[figure]/page.tsx` — wire the new workspace into the dispatcher
   - `src/components/learn/Shape.tsx` — add the new shape geometry
   - `src/app/page.tsx` — add the new row to the figure list

Don't write the code yet. Sketch the figure, name the gate, then ask the user to confirm before you propose any edits.
