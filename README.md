# Dancing with Claude Code

A five-figure choreography for learning to direct Claude Code. The user works inside a small browser-based webcam project; each figure surfaces one capability frequent Claude users still don't have a feel for — slash commands they never invoked, a `CLAUDE.md` they never edited, a tool call they auto-accepted. The score they write as they dance is their own CLAUDE.md, which grows asynchronously across all five figures.

The progression axis is **Claude-usage sophistication**, not the perception domain. Each figure earns a Bauhaus shape; the dancer takes form as the user goes.

| Figure | Shape | Capability |
|---|---|---|
| 1 | Circle | Reading & directing Claude via `CLAUDE.md` |
| 2 | Triangle | Discovering and invoking slash commands |
| 3 | Arc | Writing a directive instead of chatting |
| 4 | Square | Reading tool-use as it happens; reviewing before accept |
| 5 | Composite | Scoping changes to one segment |

## Design inspiration

The visual language draws from **Oskar Schlemmer's Bauhaus dances** (1922–1929) — the *Triadic Ballet*, *Form Dance*, *Gesture Dance*, *Space Dance* — where dancers' bodies are constructed of geometric primitives (cones, cylinders, discs, spheres) and the choreography is laid out as a score of cells with handwritten *Pause* annotations between figures. The five earned shapes here are the costume of the dancer the user is building.

## Requirements

- **Node.js 20.18+** (declared in `package.json` `engines.node`).
- **Recommended: Node 24.15.0 LTS** — pinned in `.nvmrc`.
- **`ANTHROPIC_API_KEY`** in `.env.local` — the prototype routes every reply through the Claude Agent SDK locally.

If you use `nvm`, `fnm`, or `asdf`, the `.nvmrc` is picked up automatically.

```bash
# with nvm
nvm install   # reads .nvmrc → installs 24.15.0 if missing
nvm use       # activates 24.15.0 for this shell

# with fnm
fnm use       # same idea

# verify
node --version   # should print v24.15.0 (or your installed 20.18+)
```

If you don't use a version manager, install Node 24.15.0 from <https://nodejs.org/> (or your OS package manager). Anything ≥ 20.18 will work; 24.15.0 is what this prototype is tested against.

## Quick start

```bash
nvm use                       # optional but recommended
npm install
cp .env.example .env.local    # add your ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000> (or 3001 if 3000 is taken — Next.js will print the active URL).

The prototype is **local-only**. The Agent SDK runs in the dev server's Node process, reads `CLAUDE.md` and `.claude/commands/` from this directory natively, and persists conversation sessions to `~/.claude/projects/`. There is no deployed mode.

**Why local-only?** The prototype is local-first by design — figure 5 performs real `git` operations on the checkout (branch, merge, discard), which a hosted version couldn't faithfully demonstrate.

### Starting fresh

The app stores progress (earned shapes, conversation session IDs, CLAUDE.md edits, dismissed onboarding cards) in your browser's localStorage. A fresh clone in a fresh browser sees a clean slate. To reset state without clearing browser storage by hand, click **Reset progress** in the footer of the landing page — it clears everything in one go.

## Practice this with your own Claude Code

This repo is the project you're learning to direct. The figures you walk in the browser teach moves you can apply in any surface where Claude Code runs — terminal, desktop app, API. To practice in your own terminal against this codebase:

```bash
git clone git@github.com:kandizzy/dancing-with-claude-code.git
cd dancing-with-claude-code
npm install
claude    # opens Claude Code in this folder; it reads CLAUDE.md on start
```

Good first moves once you're in: try `/explain-figure 1` to have Claude walk you through a figure's code, or paste a directive from Figure 3 and watch Claude propose the edit. See `CONTRIBUTING.md` for the fork → branch → claude → PR loop.

## Future direction

This prototype is a teaching surface that runs in the browser and calls the Claude API via the Agent SDK. That works, but every call bills the user's API key — a small but real friction for students on limited budgets.

A more honest next iteration would **restructure the prototype to run inside Claude Code itself**. Students would open it via `claude` and the lessons would happen in the terminal or desktop app rather than the browser, drawing on whatever Claude subscription the student already has rather than per-call API spend. This also moves closer to how the lessons originally worked when taught in person — the figures become a workflow layer over a real example repo (e.g. [smart-objects-cameras](https://github.com/kandizzy/smart-objects-cameras)) where students pick a camera and walk the five moves on it. The Bauhaus shapes stay; the surface, the cost model, and the example all become the student's choice.

That's a real rebuild, not an iteration, and not what this version is. Noted here so future-me (and anyone reading the repo) sees where it's going.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · Base UI · `lucide-react` · `@anthropic-ai/claude-agent-sdk`
