# Desktop translation notes

Running notes on how each web mechanic in this prototype maps to its **Claude Code desktop equivalent** when applied to a real codebase (the concrete target here is a classroom repo of perception scripts — Python detectors on Raspberry Pi 5s with OAK-D cameras, treated below as the "target project").

The web prototype demonstrates a pattern. The pattern's home is on the user's laptop, in `claude` (the CLI) running against their own repo. This doc keeps those two surfaces aligned as we build.

## General mapping

| Web concept | Desktop equivalent | Notes |
|---|---|---|
| The figure UI | Claude Code CLI session itself | Figures are scaffolds; once internalized, the user just does these things in the terminal. |
| Side-panel chat | Default Claude Code prompt loop | Same role; web wraps it with shape rewards. |
| The live CLAUDE.md author in Figure 1 | The user's actual `CLAUDE.md`, edited in their editor | Auto-read by `claude` when started from that folder. The web prototype simulates the file edit + re-read loop in one panel. |
| Slash commands shown in Figure 2 | Slash commands in `~/.claude/commands/` or repo `.claude/commands/` | The repo already has them; students don't know. |
| Tool-use visibility in Figure 4 | Claude Code's default tool-call output | Already visible in CLI; the muscle is to *read* it, not auto-`y`. |
| Scoping in Figure 5 | Git branch / file-scoped task | "Modify person_detector_alice.py, leave person_detector.py alone." |

## Per-figure translation (filled as built)

### F1 Circle — CLAUDE.md authoring ✅ built (v2)
- **Web:** CLAUDE.md is live, user-mutable state persisted to `localStorage`. The author panel (`src/components/learn/ClaudeMdAuthor.tsx`) shows three sections: a readonly *stack* describing the playground, editable *behavior rules* for Claude, and the user's *pinned notes* (empty at seed). Each Claude reply gets a `PromoteButton` that opens an inline editor so the user can refine the text before pinning. The figure's API route receives the current CLAUDE.md state in every request and assembles the system prompt at call time via `assembleSystemPrompt()` in `src/lib/figures/registry.ts`. Gate: `findUserEntryMatch()` scans Claude's reply for a substring of any pinned entry (full normalized match OR a 4-word slice). On match → circle awarded, matched span highlighted in the reply, and the entry that triggered it pulses in the author panel.
- **Desktop:** Open Terminal → `cd` into the target project → run `claude` → ask a question → if the answer is worth remembering, edit `CLAUDE.md` in your editor and add a line under a Notes section → ask again → Claude reads the updated file from `cd`'s working directory on each restart of the session (or via `/memory` updates inside-session).
- **Translation gap:** On desktop the CLAUDE.md is invisible (a file on disk auto-loaded at session start); the web has to render it live alongside the chat so the user *sees* the cause-and-effect compress to seconds. The teaching move on desktop: "What we did in one panel on the web, you'd do across your editor + terminal at home."
- **Design choice worth noting:** the v1 web prototype's seed content is browser-CV-native (MediaPipe Tasks, detection shape, behavior rules about CV reasoning). It does *not* include the Pi/venv/Python content from the real classroom CLAUDE.md, because that context only makes sense once the user is on their machine. A v2 (local) iteration of this tool can carry over the venv/Pi/Python content as the seed.
- **Honest no-key behavior:** when the server has no `ANTHROPIC_API_KEY`, the route returns a generic reply that intentionally won't echo any pinned entry, so the F1 gate fails honestly until a key is set.

### F2 Triangle — Slash command discovery ✅ built (working)
- **Web:** `Figure2Workspace.tsx` adds a slash-command palette to the input. Typing `/` filters the live on-disk commands from `.claude/commands/*.md`; picking one stages `/<name>` in the input and the body of the file becomes the actual prompt at send time. `$ARGUMENTS` in the body is replaced with whatever the user types after the slash token. The gate fires when the user sends a message whose token matches a staged command — proof they invoked a command rather than typed from scratch. The user's invocation appears tagged with `/command-name` above their message bubble.
- **Desktop:** `.claude/commands/<name>.md` files in the repo. Type `/<name>` in `claude` to invoke. The repo can ship them; users discover them via tab-completion or the `/help` listing.
- **Translation gap:** In the web prototype the palette is visible by typing `/`; in Claude Code the discovery happens via tab-complete and `/help`. The pedagogy is identical — *they exist; look*.

### F3 Arc — Directive-writing ✅ built (working)
- **Web:** `Figure3Workspace.tsx` is a three-field form (Scope / Target / Action). Submission assembles a directive prompt and sends. The gate fires when all three fields are non-empty at submit time — the user demonstrated structured directive-writing.
- **Desktop:** No special tooling — the same muscle expressed in prose. The pattern: name the scope (which area), name the target (which file or line range), name one specific action. Avoid open-ended chat.
- **Translation gap:** None of consequence. The form is training wheels; on desktop, the user types the same three things in one prompt.

### F4 Square — Review before you accept ✅ built (v2 — real diff)
- **Web:** `Figure4Workspace.tsx` sends with `FIGURE_4_EXTRA_SYSTEM` instructing Claude to return the full proposed new CLAUDE.md inside a fenced markdown block. The workspace diffs the proposed file against the current `claudeMd` via `diffLines()` from the `diff` package and renders a unified +/- view. Accept applies via `setClaudeMd()` (which the store debounces to disk); Reject discards. The gate fires on either choice — the muscle is reading the diff, not the verdict.
- **Desktop:** Claude Code already pauses on every file edit with a diff preview and y/n prompt. Same loop. The muscle is to read the diff before pressing y.
- **Translation gap:** The web operates on CLAUDE.md (the artifact most legible to a designer); desktop operates on any file the Edit tool touches. Identical pedagogy.

### F5 Composite — Branch, scope, diff, merge ✅ built (v2 — real git workflow)
- **Web:** `Figure5Workspace.tsx` is a five-beat walkthrough mapping to the Composite shape's strokes: Branch → Scope → Ask → Diff → Decide. Step 1 derives `feature/<slug>` from the user's goal and POSTs to `/api/git` which runs real `git checkout -b`. Step 3's "Refine with Claude" uses `FIGURE_5_EXTRA_SYSTEM` to compose a scoped directive; "Run claude -p" then invokes the CLI bridge on the branch. Step 4 fetches real `git diff`. Step 5's Merge or Discard buttons POST to `/api/git` (real `git merge` or `git branch -D`). The decision triggers a Sendoff view with the animated composite Shape and a "you're ready for Claude Code in the terminal" page. Gate fires on the merge/discard decision.
- **Desktop:** The five beats unwrapped — type the same commands at your prompt, run `claude -p '<directive>'` against the branch, look at `git diff`, then `git merge` or `git branch -D`. The figure is literally a tutored walk through the desktop flow.
- **Translation gap:** None of consequence. The figure runs the same commands the user would run; only the wrapping differs.

## Open questions

- Should the desktop "version" be a standalone slash command (`/learn-claude-code`) installable into the repo, or is the web prototype enough as a one-time onboarding artifact? (Lean: the web is onboarding; a `.claude/commands/figure-up.md` could be the in-repo follow-up artifact for next year's class.)
- Survey question wording will need slight adjustment to re-administer post-prototype — those edits go here as they crystallize.
