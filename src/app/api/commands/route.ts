import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

type SlashCommand = {
  name: string
  description: string
  body: string
}

function commandsDir() {
  return path.join(process.cwd(), '.claude', 'commands')
}

// Parse YAML-ish frontmatter (just the description: line) out of a slash command file.
// Format mirrors Claude Code's own:
//   ---
//   description: short text
//   ---
//   the command body
function parseFrontmatter(raw: string): { description: string; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) return { description: '', body: raw.trim() }
  const fm = match[1]
  const body = match[2].trim()
  const descMatch = fm.match(/^description:\s*(.*)$/m)
  return { description: descMatch ? descMatch[1].trim() : '', body }
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ commands: [] })
  }
  try {
    const dir = commandsDir()
    const entries = await readdir(dir).catch(() => [])
    const commands: SlashCommand[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue
      const fullPath = path.join(dir, entry)
      const raw = await readFile(fullPath, 'utf8')
      const { description, body } = parseFrontmatter(raw)
      commands.push({
        name: entry.replace(/\.md$/, ''),
        description,
        body,
      })
    }
    commands.sort((a, b) => a.name.localeCompare(b.name))
    return Response.json({ commands })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to read commands' },
      { status: 500 },
    )
  }
}
