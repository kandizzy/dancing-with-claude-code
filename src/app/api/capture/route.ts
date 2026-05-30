import { readFile } from 'node:fs/promises'

export const runtime = 'nodejs'

// Dev-only. Hardcoded path for this experiment — points at the user's local OAK capture.
// If this experiment graduates beyond "let's see what it looks like," parameterize via an
// env var or move the file into the repo under public/.
const CAPTURE_PATH = '/Users/ck/Downloads/oak-captures/dance.jsonl'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'capture route is dev-only' }, { status: 403 })
  }
  try {
    const raw = await readFile(CAPTURE_PATH, 'utf8')
    const frames = raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line))
    return Response.json({ frames })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'failed to read capture' },
      { status: 500 },
    )
  }
}
