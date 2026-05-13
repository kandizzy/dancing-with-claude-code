# Desktop translation notes

Running notes on how each web mechanic in this prototype maps to its **Claude Code desktop equivalent** when applied to a real codebase (the concrete target here is a classroom repo of perception scripts — Python detectors on Raspberry Pi 5s with OAK-D cameras, treated below as the "target project").

The web prototype demonstrates a pattern. The pattern's home is on the user's laptop, in `claude` (the CLI) running against their own repo. This doc keeps those two surfaces aligned as we build.

## General mapping

| Web concept | Desktop equivalent | Notes |
|---|---|---|
| The level UI | Claude Code CLI session itself | Levels are scaffolds; once internalized, the user just does these things in the terminal. |
| Side-panel chat | Default Claude Code prompt loop | Same role; web wraps it with shape rewards. |
| The CLAUDE.md displayed in Level 1 | The repo's actual `CLAUDE.md` | Auto-read by `claude` when started from that folder. |
| Slash commands shown in Level 2 | Slash commands in `~/.claude/commands/` or repo `.claude/commands/` | The repo already has them; students don't know. |
| Tool-use visibility in Level 4 | Claude Code's default tool-call output | Already visible in CLI; the muscle is to *read* it, not auto-`y`. |
| Scoping in Level 5 | Git branch / file-scoped task | "Modify person_detector_alice.py, leave person_detector.py alone." |

## Per-level translation (filled as built)

### L1 Circle — CLAUDE.md awareness ✅ built
- **Web:** Implemented in `src/app/learn/[level]/page.tsx`. A real CLAUDE.md excerpt from a target project lives in `src/lib/levels/level-1.ts` and is bound as the level's `systemPrompt`. The user composes a directive; Claude responds; the gate at `findGateMatch()` in `src/lib/levels/registry.ts` scans the reply for fingerprint tokens (Pi hostnames, venv path, pinned versions, detector script names). On match → shape awarded + success copy + matched token highlighted in Claude's reply. On miss → nudge with an expandable hint list.
- **Desktop:** Open Terminal → `cd` into the target project → run `claude` → ask "what venv should I activate before running detectors?" → Claude answers `/opt/oak-shared/venv/bin/activate` *only because* CLAUDE.md is in context.
- **Translation gap:** On desktop the CLAUDE.md is invisible (auto-loaded); the web has to *show* it. The teaching move on desktop is: "Notice Claude knew this without you pasting anything — that's CLAUDE.md doing its job."
- **Design choice worth noting:** the web prototype embeds an excerpt of the CLAUDE.md as a string constant rather than fetching the real file. That keeps the demo self-contained and Vercel-deployable. The excerpt is faithful enough that the same fingerprints would appear in the real file's responses — users would see the same teaching moment on desktop.
- **Honest no-key behavior:** when the server has no `ANTHROPIC_API_KEY`, the route returns a fingerprint-free generic reply so the gate fails honestly. This is the opposite of the scaffold's chat fallback (which returns a canned reply) — for the level mechanics, an auto-pass would undermine the pedagogy.

### L2 Triangle — Slash command discovery _(pending)_

### L3 Arc — Directive-writing _(pending)_

### L4 Square — Tool-use visibility _(pending)_
- Anticipated translation gap: web has to render fake/real tool-call cards; desktop already does. The pedagogy is identical — *don't auto-accept*.

### L5 Composite — Scoped change _(pending)_

## Open questions

- Should the desktop "version" be a standalone slash command (`/learn-claude-code`) installable into the repo, or is the web prototype enough as a one-time onboarding artifact? (Lean: the web is onboarding; a `.claude/commands/level-up.md` could be the in-repo follow-up artifact for next year's class.)
- Survey question wording will need slight adjustment to re-administer post-prototype — those edits go here as they crystallize.
