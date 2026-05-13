import { ClaudeHeading, ClaudeParagraph } from './ClaudeMessage'

type AssistantBodyProps = {
  text: string
}

/**
 * Lightweight markdown-ish renderer. Renders **bold** and **heading lines**.
 * Replace with a real markdown renderer when wiring up the API.
 */
export function AssistantBody({ text }: AssistantBodyProps) {
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />

        if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
          return (
            <ClaudeHeading key={i} level={3}>
              {line.slice(2, -2)}
            </ClaudeHeading>
          )
        }

        const parts = line
          .split(/(\*\*[^*]+\*\*)/g)
          .map((p, j) =>
            p.startsWith('**') && p.endsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p,
          )

        return <ClaudeParagraph key={i}>{parts}</ClaudeParagraph>
      })}
    </>
  )
}
