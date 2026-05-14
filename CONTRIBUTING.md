# Contributing to Dancing with Claude

This prototype is a teaching artifact. It is designed to grow by contribution — the student who learns from it should also be able to extend it.

## The loop

```
fork  →  branch  →  claude  →  PR
```

1. **Fork** the repo on GitHub.
2. **Clone** your fork locally and create a branch:
   ```bash
   git clone <your-fork-url>
   cd dancing-with-claude/prototype
   git switch -c my-change
   ```
3. **Run Claude Code** in the project folder so it reads `CLAUDE.md`:
   ```bash
   claude
   ```
4. **Compose a directive.** Use Figure 3 or 5 of the deployed app to refine it, or write your own. Direct Claude at one file. Review the diff before accepting.
5. **Verify.** `npm run build` should pass before you push.
6. **Push and PR** back to the upstream repo. Mention which figure or capability your change touches.

## Good first changes

- **Add a behavior rule** to the seed CLAUDE.md in `src/lib/figures/figure-1.ts` that reflects a preference you discovered while using the app.
- **Add a starter slash command** under `.claude/commands/`. It will be discoverable to future users who clone this repo.
- **Tweak the copy** on a figure's intro or task line in `src/lib/figures/figure-N.ts` so the lesson lands better for someone like you.
- **Propose a new figure.** Run `/propose-new-figure` in `claude` to sketch one; the slash command will name the files you'd touch.

## What lives where

- `src/app/page.tsx` — the home / figure index
- `src/app/learn/[figure]/page.tsx` — per-figure layout shell
- `src/components/learn/Figure{1..5}Workspace.tsx` — the workspace for each figure
- `src/lib/figures/figure-{1..5}.ts` — copy + system-prompt extras per figure
- `src/lib/learn-store.tsx` — earned-shape state, CLAUDE.md state, persistence
- `src/components/learn/WebcamPlayground.tsx` — MediaPipe Tasks face detection in the browser
- `src/components/explore/` — the SVG-animation sandbox (Tier 3 dancer is being prototyped here)

## House rules

- One change per PR. Scope creep was the survey's biggest complaint about Claude.
- Run `npm run build` before pushing — it's the type-check too.
- If your change touches a figure's pedagogical claim (the "what we say we teach"), update the README + figure intro copy in the same PR.
