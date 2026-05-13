import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

function guardProd() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json(
      { error: 'On-disk routes are unavailable in production. Run locally.' },
      { status: 400 },
    )
  }
  return null
}

function claudeMdPath() {
  return path.join(process.cwd(), 'CLAUDE.md')
}

export async function GET() {
  const blocked = guardProd()
  if (blocked) return blocked
  try {
    const text = await readFile(claudeMdPath(), 'utf8')
    return Response.json({ text })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to read CLAUDE.md' },
      { status: 500 },
    )
  }
}

export async function PUT(req: Request) {
  const blocked = guardProd()
  if (blocked) return blocked
  let body: { text?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof body.text !== 'string') {
    return Response.json({ error: 'Body must be { text: string }' }, { status: 400 })
  }
  try {
    await writeFile(claudeMdPath(), body.text, 'utf8')
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to write CLAUDE.md' },
      { status: 500 },
    )
  }
}
