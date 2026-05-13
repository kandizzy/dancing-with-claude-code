# Dancing with Claude

A five-figure choreography for learning to direct Claude Code. The user works inside a browser computer-vision playground; each figure surfaces one capability frequent Claude users still don't have a feel for — slash commands they never invoked, a `CLAUDE.md` they never edited, a tool call they auto-accepted. The score they write as they dance is their own CLAUDE.md, which grows asynchronously across all five figures.

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

## Practice this with your own Claude Code

This repo is the project you're learning to direct. Figures 3 and 5 are designed as a round-trip: you compose a directive in the browser, run it against this cloned codebase in your own `claude` session, then paste back what Claude said to close the loop.

```bash
git clone <this-repo-url>
cd dancing-with-claude/prototype
npm install
claude    # opens Claude Code in this folder; it reads CLAUDE.md on start
```

Good first moves once you're in: try `/explain-figure 1` to have Claude walk you through a figure's code, or paste a directive from Figure 3 of the deployed app and watch Claude propose the edit. See `CONTRIBUTING.md` for the fork → branch → claude → PR loop.

## Quick start (deployed app)

```bash
nvm use                       # optional but recommended
npm install
cp .env.example .env.local    # add your ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000>.

Without an `ANTHROPIC_API_KEY`, the figure-chat API returns a fingerprint-free generic reply so the gate fails honestly — set the key to unlock real Claude responses.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · Base UI · `lucide-react` · `@anthropic-ai/sdk`
