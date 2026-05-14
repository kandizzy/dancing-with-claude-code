import { spawn } from 'node:child_process'

export const runtime = 'nodejs'

// Safety: branch names this route will accept. `feature/` prefix + lowercase slug only.
// Refusing anything else keeps F5 from mutating arbitrary branch names like `main` or `HEAD`.
const ALLOWED_BRANCH = /^feature\/[a-z0-9][a-z0-9-]{0,80}$/

// Base branch to merge/return to. We assume `main` — change here if the host repo uses
// `master` or something else.
const BASE_BRANCH = 'main'

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
  | { action: 'merge'; name: string }
  | { action: 'discard'; name: string }

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

  const name = (body as { name?: string }).name ?? ''
  if (!ALLOWED_BRANCH.test(name)) {
    return Response.json(
      {
        ok: false,
        error: `branch name must match ${ALLOWED_BRANCH.source} (e.g. feature/my-change)`,
      },
      { status: 400 },
    )
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
    // Switch to base then merge the feature branch in. If a merge conflict happens we surface
    // the message rather than auto-aborting — the user can sort it out manually.
    const co = await runGit(['checkout', BASE_BRANCH])
    if (!co.ok) {
      return Response.json({ ok: false, error: co.error }, { status: 500 })
    }
    const merge = await runGit(['merge', '--no-edit', name])
    if (!merge.ok) {
      return Response.json({ ok: false, error: merge.error }, { status: 500 })
    }
    return Response.json({ ok: true, mergedInto: BASE_BRANCH })
  }

  if (body.action === 'discard') {
    // Switch off the branch first — git refuses to delete the branch you're on.
    const co = await runGit(['checkout', BASE_BRANCH])
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
