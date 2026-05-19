import { spawn } from 'node:child_process'

export const runtime = 'nodejs'

// Branches F5 must never create, merge, or delete. The base branch passed in for a
// merge/discard target is allowed to be one of these (merging into `main` is normal) —
// but the F5 working branch itself never can be.
const PROTECTED_BRANCHES = new Set(['HEAD', 'main', 'master'])

// Loose git-ref validation — any reasonable branch name, not just `feature/...`. Real
// users (and students who already work on their own branches) aren't limited to one
// prefix. Still rejects shell-unsafe and malformed names so the route can't be coaxed
// into operating on something dangerous.
function branchNameError(value: string, label: string): string | null {
  if (!value) return `${label} is required`
  if (value.length > 200) return `${label} is too long`
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) {
    return `${label} may only contain letters, numbers, and . _ / -`
  }
  if (value.includes('..') || value.includes('//')) return `${label} is malformed`
  if (/^[./]|[./]$/.test(value)) return `${label} can't start or end with . or /`
  return null
}

type Ok<T> = { ok: true } & T
type Err = { ok: false; error: string }
type GitResult = Ok<{ stdout: string; stderr: string }> | Err

function runGit(args: string[]): Promise<GitResult> {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd: process.cwd(),
      env: { ...process.env, TERM: 'dumb' },
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (b: Buffer) => {
      out += b.toString('utf8')
    })
    child.stderr.on('data', (b: Buffer) => {
      err += b.toString('utf8')
    })
    child.on('error', (e) => {
      resolve({ ok: false, error: e.message })
    })
    child.on('close', (code) => {
      if (code !== 0 && code !== null) {
        resolve({ ok: false, error: err.trim() || out.trim() || `git ${args[0]} exited with ${code}` })
      } else {
        resolve({ ok: true, stdout: out, stderr: err })
      }
    })
  })
}

async function currentBranch(): Promise<string | null> {
  const res = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
  if (!res.ok) return null
  return res.stdout.trim() || null
}

async function isClean(): Promise<boolean> {
  const res = await runGit(['status', '--porcelain'])
  if (!res.ok) return false
  return res.stdout.trim().length === 0
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ branch: null, clean: false, available: false })
  }
  const branch = await currentBranch()
  const clean = await isClean()
  return Response.json({ branch, clean, available: true })
}

type Action =
  | { action: 'branch'; name: string }
  | { action: 'merge'; name: string; baseBranch: string }
  | { action: 'discard'; name: string; baseBranch: string }

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ ok: false, error: 'git route is dev-only' }, { status: 403 })
  }
  let body: Action
  try {
    body = (await req.json()) as Action
  } catch {
    return Response.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || !('action' in body)) {
    return Response.json({ ok: false, error: 'missing action' }, { status: 400 })
  }

  // The F5 working branch — created, merged, then deleted. Must be a valid name and
  // must not be a protected branch (we never create/merge/delete main itself).
  const name = (body as { name?: string }).name ?? ''
  const nameErr = branchNameError(name, 'branch name')
  if (nameErr) {
    return Response.json({ ok: false, error: nameErr }, { status: 400 })
  }
  if (PROTECTED_BRANCHES.has(name)) {
    return Response.json(
      { ok: false, error: `refusing to operate on protected branch "${name}"` },
      { status: 400 },
    )
  }

  // For merge/discard, baseBranch is where we check out back to (and, for merge, what we
  // merge into). It may legitimately be `main` — the protected check doesn't apply here.
  let baseBranch = ''
  if (body.action === 'merge' || body.action === 'discard') {
    baseBranch = (body as { baseBranch?: string }).baseBranch ?? ''
    const baseErr = branchNameError(baseBranch, 'base branch')
    if (baseErr) {
      return Response.json({ ok: false, error: baseErr }, { status: 400 })
    }
    if (baseBranch === name) {
      return Response.json(
        { ok: false, error: 'base branch and working branch must differ' },
        { status: 400 },
      )
    }
  }

  if (body.action === 'branch') {
    // We used to refuse if the working tree was dirty. That was over-cautious — `git checkout
    // -b` succeeds with a dirty tree and carries the uncommitted edits onto the new branch.
    // The figure surfaces the dirty state in the status bar so the user knows what's going on.
    const res = await runGit(['checkout', '-b', name])
    if (!res.ok) {
      return Response.json({ ok: false, error: res.error }, { status: 500 })
    }
    return Response.json({ ok: true, branch: name })
  }

  if (body.action === 'merge') {
    // Switch back to the base branch the user started from, then merge the working branch
    // in. If a merge conflict happens we surface the message rather than auto-aborting —
    // the user can sort it out manually.
    const co = await runGit(['checkout', baseBranch])
    if (!co.ok) {
      return Response.json({ ok: false, error: co.error }, { status: 500 })
    }
    const merge = await runGit(['merge', '--no-edit', name])
    if (!merge.ok) {
      return Response.json({ ok: false, error: merge.error }, { status: 500 })
    }
    return Response.json({ ok: true, mergedInto: baseBranch })
  }

  if (body.action === 'discard') {
    // Switch back to the base branch first — git refuses to delete the branch you're on.
    const co = await runGit(['checkout', baseBranch])
    if (!co.ok) {
      return Response.json({ ok: false, error: co.error }, { status: 500 })
    }
    const del = await runGit(['branch', '-D', name])
    if (!del.ok) {
      return Response.json({ ok: false, error: del.error }, { status: 500 })
    }
    return Response.json({ ok: true, discarded: name })
  }

  return Response.json({ ok: false, error: 'unknown action' }, { status: 400 })
}
