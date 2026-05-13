import { spawn } from 'node:child_process'

export const runtime = 'nodejs'

function runGitDiff(): Promise<{ diff: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', ['diff', '--no-color'], {
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
      resolve({ diff: '', error: e.message })
    })
    child.on('close', (code) => {
      if (code !== 0 && code !== null) {
        resolve({ diff: out, error: err.trim() || `git diff exited with code ${code}` })
      } else {
        resolve({ diff: out })
      }
    })
  })
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ diff: '' })
  }
  const { diff, error } = await runGitDiff()
  return Response.json({ diff, error })
}
