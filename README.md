# Five Shapes

A five-level in-app learning experience that progressively teaches Claude Code usage patterns. The user starts in unfamiliar domain territory (spatial intelligence — face detection, perception models), and each level earns them a Bauhaus shape by proving they used a specific Claude capability they didn't have before.

The progression axis is **Claude-usage sophistication**, not the domain. Levels:

| # | Shape | Capability |
|---|---|---|
| 1 | Circle | Reading & directing Claude via `CLAUDE.md` |
| 2 | Triangle | Discovering and invoking slash commands |
| 3 | Arc | Writing a directive instead of chatting |
| 4 | Square | Reading tool-use as it happens; reviewing before accept |
| 5 | Composite | Scoping changes to one segment |

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

## Quick start

```bash
nvm use                       # optional but recommended
npm install
cp .env.example .env.local    # add your ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000/learn>.

Without an `ANTHROPIC_API_KEY`, the level API returns a fingerprint-free generic reply so the gate fails honestly — set the key to unlock real Claude responses.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · Base UI · `lucide-react` · `@anthropic-ai/sdk`
