# Desktop translation notes

Running notes on how each web mechanic in this prototype maps to its **Claude Code desktop equivalent** when applied to a real codebase (the concrete target here is a classroom repo of perception scripts — Python detectors on Raspberry Pi 5s with OAK-D cameras, treated below as the "target project").

The web prototype demonstrates a pattern. The pattern's home is on the user's laptop, in `claude` (the CLI) running against their own repo. This doc keeps those two surfaces aligned as we build.

## General mapping

| Web concept | Desktop equivalent | Notes |
|---|---|---|
| The level UI | Claude Code CLI session itself | Levels are scaffolds; once internalized, the user just does these things in the terminal. |
| Side-panel chat | Default Claude Code prompt loop | Same role; web wraps it with shape rewards. |
| The live CLAUDE.md author in Level 1 | The user's actual `CLAUDE.md`, edited in their editor | Auto-read by `claude` when started from that folder. The web prototype simulates the file edit + re-read loop in one panel. |
| Slash commands shown in Level 2 | Slash commands in `~/.claude/commands/` or repo `.claude/commands/` | The repo already has them; students don't know. |
| Tool-use visibility in Level 4 | Claude Code's default tool-call output | Already visible in CLI; the muscle is to *read* it, not auto-`y`. |
| Scoping in Level 5 | Git branch / file-scoped task | "Modify person_detector_alice.py, leave person_detector.py alone." |

## Per-level translation (filled as built)

### L1 Circle — CLAUDE.md authoring ✅ built (v2)
- **Web:** CLAUDE.md is live, user-mutable state persisted to `localStorage`. The author panel (`src/components/learn/ClaudeMdAuthor.tsx`) shows three sections: a readonly *stack* describing the playground, editable *behavior rules* for Claude, and the user's *pinned notes* (empty at seed). Each Claude reply gets a `PromoteButton` that opens an inline editor so the user can refine the text before pinning. The level's API route (`src/app/api/level-chat/route.ts`) receives the current CLAUDE.md state in every request and assembles the system prompt at call time via `assembleSystemPrompt()` in `src/lib/levels/registry.ts`. Gate: `findUserEntryMatch()` scans Claude's reply for a substring of any pinned entry (full normalized match OR a 4-word slice). On match → circle awarded, matched span highlighted in the reply, and the entry that triggered it pulses in the author panel.
- **Desktop:** Open Terminal → `cd` into the target project → run `claude` → ask a question → if the answer is worth remembering, edit `CLAUDE.md` in your editor and add a line under a Notes section → ask again → Claude reads the updated file from `cd`'s working directory on each restart of the session (or via `/memory` updates inside-session).
- **Translation gap:** On desktop the CLAUDE.md is invisible (a file on disk auto-loaded at session start); the web has to render it live alongside the chat so the user *sees* the cause-and-effect compress to seconds. The teaching move on desktop: "What we did in one panel on the web, you'd do across your editor + terminal at home."
- **Design choice worth noting:** the v1 web prototype's seed content is browser-CV-native (MediaPipe Tasks, detection shape, behavior rules about CV reasoning). It does *not* include the Pi/venv/Python content from the real classroom CLAUDE.md, because that context only makes sense once the user is on their machine. A v2 (local) iteration of this tool can carry over the venv/Pi/Python content as the seed.
- **Honest no-key behavior:** when the server has no `ANTHROPIC_API_KEY`, the route returns a generic reply that intentionally won't echo any pinned entry, so the L1 gate fails honestly until a key is set.

### L2 Triangle — Slash command discovery _(pending)_

### L3 Arc — Directive-writing _(pending)_

### L4 Square — Tool-use visibility _(pending)_
- Anticipated translation gap: web has to render fake/real tool-call cards; desktop already does. The pedagogy is identical — *don't auto-accept*.

### L5 Composite — Scoped change _(pending)_

## Open questions

- Should the desktop "version" be a standalone slash command (`/learn-claude-code`) installable into the repo, or is the web prototype enough as a one-time onboarding artifact? (Lean: the web is onboarding; a `.claude/commands/level-up.md` could be the in-repo follow-up artifact for next year's class.)
- Survey question wording will need slight adjustment to re-administer post-prototype — those edits go here as they crystallize.
