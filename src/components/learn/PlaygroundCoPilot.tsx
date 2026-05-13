'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, FilePlus, FileText, GitCompareArrows, Loader2, Sparkles, Square, Terminal } from 'lucide-react'
import { Button } from '@/components/ui'
import { ClaudeMessage } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { UserMessage } from '@/components/chat/UserMessage'
import { useLearnStore } from '@/lib/learn-store'
import { ask, listCommands, readClaudeMd, readDiff, type SlashCommand } from '@/lib/ai/client'
import { findUserEntryMatch, getBehaviorRules, getNoteEntries } from '@/lib/levels/registry'
import { cn } from '@/lib/utils'

type Mode = 'cli' | 'api'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: { via?: 'slash' | 'directive'; commandName?: string; scopedTo?: string }
}

const SYSTEM_PROMPT = `You are Claude, the co-pilot inside a browser computer-vision playground (Dancing with Claude). The user has a CLAUDE.md file on disk and a set of slash commands in .claude/commands/. When invoked via the CLI you can read those files and edit code directly; when invoked via the API you have only the text shown to you. Keep replies short (2–4 short paragraphs) and concrete. When the user names a target, do not drift outside it.`

export function PlaygroundCoPilot({ className }: { className?: string }) {
  const { awardShape, isCompleted, claudeMdOpen, setClaudeMdOpen } = useLearnStore()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [mode] = useState<Mode>(
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'cli'
      : 'api',
  )
  const [commands, setCommands] = useState<SlashCommand[]>([])
  const [showPalette, setShowPalette] = useState(false)
  const [inputMode, setInputMode] = useState<'chat' | 'directive'>('chat')
  const [scopeSegments, setScopeSegments] = useState<string[]>([])
  const [scopeTarget, setScopeTarget] = useState<string>('')
  const [directiveScope, setDirectiveScope] = useState('')
  const [directiveTarget, setDirectiveTarget] = useState('')
  const [directiveAction, setDirectiveAction] = useState('')
  const [diff, setDiff] = useState('')
  const [diffOpen, setDiffOpen] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  // Pull slash commands and the CLAUDE.md (for the scope picker) on mount + after each reply.
  const refreshFromDisk = useCallback(async () => {
    const [cmds, md] = await Promise.all([listCommands(), readClaudeMd()])
    setCommands(cmds)
    const segments: string[] = []
    if (md) {
      getBehaviorRules(md).forEach((rule, i) => segments.push(`Behavior rule #${i + 1}: ${rule}`))
      getNoteEntries(md).forEach((note, i) => segments.push(`Note #${i + 1}: ${note}`))
    }
    setScopeSegments(segments)
  }, [])

  useEffect(() => {
    refreshFromDisk()
  }, [refreshFromDisk])

  useEffect(() => {
    // Scroll to bottom on new messages.
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const send = useCallback(
    async (userPrompt: string, meta?: Message['meta']) => {
      if (!userPrompt.trim() || streaming) return
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userPrompt,
        meta,
      }
      setMessages((m) => [...m, userMsg])
      setStreaming(true)
      setLastError(null)
      try {
        const result = await ask({ mode, systemPrompt: SYSTEM_PROMPT, userPrompt })
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.text,
        }
        setMessages((m) => [...m, assistantMsg])

        // F1 gate: the latest CLAUDE.md notes appear in the reply?
        const md = await readClaudeMd()
        if (md && !isCompleted(1)) {
          const matched = findUserEntryMatch(result.text, md)
          if (matched) awardShape(1, 'circle', matched)
        }

        // F2 gate: user invoked a slash command.
        if (meta?.via === 'slash' && !isCompleted(2)) {
          awardShape(2, 'triangle', `/${meta.commandName ?? 'cmd'}`)
        }
        // F3 gate: user submitted via the directive form.
        if (meta?.via === 'directive' && !isCompleted(3)) {
          awardShape(3, 'arc', userPrompt.slice(0, 80))
        }
        // F5 gate: user submitted with scope set.
        if (meta?.scopedTo && !isCompleted(5)) {
          awardShape(5, 'composite', `scoped to ${meta.scopedTo}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Request failed'
        setLastError(msg)
      } finally {
        setStreaming(false)
        refreshFromDisk()
      }
    },
    [streaming, mode, isCompleted, awardShape, refreshFromDisk],
  )

  const onSendChat = useCallback(() => {
    if (!input.trim()) return
    let prompt = input.trim()
    const meta: Message['meta'] = {}
    if (scopeTarget) {
      prompt = `Scope to: ${scopeTarget}\n\n${prompt}\n\nDo not modify or comment on anything outside the scope.`
      meta.scopedTo = scopeTarget
    }
    setInput('')
    void send(prompt, meta)
  }, [input, scopeTarget, send])

  const onPickCommand = useCallback(
    (cmd: SlashCommand) => {
      setShowPalette(false)
      const meta: Message['meta'] = { via: 'slash', commandName: cmd.name }
      const prompt = `/${cmd.name}\n\n${cmd.body}`
      void send(prompt, meta)
    },
    [send],
  )

  const onSendDirective = useCallback(() => {
    if (!directiveScope.trim() || !directiveTarget.trim() || !directiveAction.trim() || streaming) return
    const prompt = `I'm sending a scoped directive. Operate strictly within these bounds.\n\nScope: ${directiveScope.trim()}\nTarget: ${directiveTarget.trim()}\nAction: ${directiveAction.trim()}\n\nAcknowledge what you'll do in one sentence, then do it. Do not touch anything outside the named target.`
    const meta: Message['meta'] = { via: 'directive' }
    if (scopeTarget) {
      meta.scopedTo = scopeTarget
    }
    setDirectiveScope('')
    setDirectiveTarget('')
    setDirectiveAction('')
    setInputMode('chat')
    void send(prompt, meta)
  }, [directiveScope, directiveTarget, directiveAction, streaming, scopeTarget, send])

  const onShowDiff = useCallback(async () => {
    const text = await readDiff()
    setDiff(text)
    setDiffOpen(true)
    if (!isCompleted(4)) awardShape(4, 'square', 'reviewed diff')
  }, [awardShape, isCompleted])

  const headerStatus = useMemo(() => {
    if (mode === 'cli') return 'CLI mode · real files on disk'
    return 'API mode · no filesystem access'
  }, [mode])

  return (
    <div
      className={cn(
        'border-border-subtle bg-surface flex min-h-0 flex-col rounded-lg border',
        className,
      )}
    >
      <header className="border-border-soft text-text-secondary flex items-center gap-2 border-b px-4 py-2 text-xs">
        <Terminal className="size-3.5" />
        <span className="font-mono">co-pilot</span>
        <span className="text-text-tertiary ml-auto italic">{headerStatus}</span>
      </header>

      <div ref={scrollerRef} className="scroll-area min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 && (
          <ClaudeMessage>
            <p className="text-text-tertiary m-0 italic">
              Ask the co-pilot anything. Try a <code>/</code> command, set a scope, or compose a
              full directive. The earned shapes light up as you exercise each muscle.
            </p>
          </ClaudeMessage>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id}>
              {m.meta?.via === 'slash' && (
                <div className="text-text-tertiary mb-1 mr-1 flex items-center justify-end gap-1 text-xs">
                  <Sparkles className="size-3" />/{m.meta.commandName}
                </div>
              )}
              {m.meta?.via === 'directive' && (
                <div className="text-text-tertiary mb-1 mr-1 flex items-center justify-end gap-1 text-xs">
                  directive
                </div>
              )}
              <UserMessage text={m.content} />
            </div>
          ) : (
            <ClaudeMessage key={m.id}>
              <ClaudeMarkdown text={m.content} />
              {mode === 'cli' && (
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={onShowDiff}
                    className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1"
                  >
                    <GitCompareArrows className="size-3" />
                    Show what changed
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaudeMdOpen(!claudeMdOpen)}
                    className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1"
                  >
                    <FilePlus className="size-3" />
                    Open CLAUDE.md
                  </button>
                </div>
              )}
            </ClaudeMessage>
          ),
        )}

        {streaming && (
          <ClaudeMessage>
            <div className="text-text-tertiary inline-flex items-center gap-2 text-xs">
              <Loader2 className="size-3 animate-spin" />
              {mode === 'cli' ? 'claude is working…' : 'thinking…'}
            </div>
          </ClaudeMessage>
        )}

        {lastError && (
          <div className="border-border-subtle text-text-secondary mt-2 rounded-md border p-3 text-xs">
            <div className="text-text-primary mb-1 font-semibold">Error</div>
            {lastError}
          </div>
        )}

        {diffOpen && (
          <div className="border-border-subtle bg-page mt-2 rounded-md border">
            <div className="border-border-soft text-text-secondary flex items-center gap-2 border-b px-3 py-1.5 text-xs">
              <GitCompareArrows className="size-3" />
              <span className="font-mono">git diff</span>
              <button
                type="button"
                onClick={() => setDiffOpen(false)}
                className="text-text-tertiary hover:text-text-primary ml-auto"
              >
                close
              </button>
            </div>
            <pre className="scroll-area max-h-72 overflow-auto p-3 font-mono text-[11px] leading-[1.55]">
              {diff || '(no changes)'}
            </pre>
          </div>
        )}
      </div>

      {/* Scope picker — always visible above the input */}
      {scopeSegments.length > 0 && (
        <div className="border-border-soft text-text-secondary flex items-center gap-2 border-t px-3 py-2 text-xs">
          <span>scope:</span>
          <select
            value={scopeTarget}
            onChange={(e) => setScopeTarget(e.target.value)}
            className="text-text-primary border-border-subtle bg-page rounded-md border px-1.5 py-0.5 text-xs"
          >
            <option value="">— none —</option>
            {scopeSegments.map((s) => (
              <option key={s} value={s}>
                {s.slice(0, 60)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Slash palette */}
      {showPalette && (
        <div className="border-border-soft max-h-44 overflow-y-auto border-t">
          {commands.length === 0 && (
            <div className="text-text-tertiary px-3 py-2 text-xs italic">
              No slash commands found in <code>.claude/commands/</code>.
            </div>
          )}
          {commands.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onPickCommand(c)}
              className="hover:bg-state-hover block w-full px-3 py-2 text-left"
            >
              <div className="text-text-primary font-mono text-xs">/{c.name}</div>
              {c.description && (
                <div className="text-text-tertiary text-xs">{c.description}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-border-soft border-t p-3">
        {inputMode === 'chat' ? (
          <>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSendChat()
                  }
                }}
                rows={2}
                disabled={streaming}
                placeholder="Ask anything. Enter to send. Shift-Enter for newline."
                className="text-text-primary font-text placeholder:text-text-tertiary border-border-subtle bg-page w-full resize-y rounded-md border px-2 py-1.5 text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
              />
              <Button
                variant="primary"
                onClick={onSendChat}
                disabled={!input.trim() || streaming}
                aria-label="Send"
              >
                {streaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>
            <div className="text-text-tertiary mt-2 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowPalette((s) => !s)}
                className="hover:text-text-primary inline-flex items-center gap-1"
              >
                <Sparkles className="size-3" />/ commands
              </button>
              <button
                type="button"
                onClick={() => setInputMode('directive')}
                className="hover:text-text-primary inline-flex items-center gap-1"
              >
                <Square className="size-3" />
                compose a directive
              </button>
              <button
                type="button"
                onClick={onShowDiff}
                className="hover:text-text-primary inline-flex items-center gap-1"
              >
                <GitCompareArrows className="size-3" />
                show recent diff
              </button>
              <button
                type="button"
                onClick={() => setClaudeMdOpen(!claudeMdOpen)}
                className="hover:text-text-primary inline-flex items-center gap-1"
              >
                <FileText className="size-3" />
                CLAUDE.md
              </button>
            </div>
          </>
        ) : (
          <DirectiveForm
            scope={directiveScope}
            target={directiveTarget}
            action={directiveAction}
            onChangeScope={setDirectiveScope}
            onChangeTarget={setDirectiveTarget}
            onChangeAction={setDirectiveAction}
            onCancel={() => setInputMode('chat')}
            onSubmit={onSendDirective}
            disabled={streaming}
          />
        )}
      </div>
    </div>
  )
}

function DirectiveForm({
  scope,
  target,
  action,
  onChangeScope,
  onChangeTarget,
  onChangeAction,
  onCancel,
  onSubmit,
  disabled,
}: {
  scope: string
  target: string
  action: string
  onChangeScope: (v: string) => void
  onChangeTarget: (v: string) => void
  onChangeAction: (v: string) => void
  onCancel: () => void
  onSubmit: () => void
  disabled?: boolean
}) {
  const allFilled = scope.trim() && target.trim() && action.trim()
  return (
    <div className="flex flex-col gap-2">
      <Row label="Scope" value={scope} onChange={onChangeScope} placeholder="What slice of the playground?" />
      <Row label="Target" value={target} onChange={onChangeTarget} placeholder="Which specific file, component, or rule?" />
      <Row label="Action" value={action} onChange={onChangeAction} placeholder="What single change?" multiline />
      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={onCancel}
          className="text-text-tertiary hover:text-text-primary"
        >
          back to chat
        </button>
        <Button variant="primary" onClick={onSubmit} disabled={!allFilled || disabled}>
          <ArrowUp className="size-4" />
          Send directive
        </Button>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </span>
      <Tag
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 2 : undefined}
        className="text-text-primary font-text placeholder:text-text-tertiary border-border-subtle bg-page rounded-md border px-2 py-1 font-sans text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
      />
    </label>
  )
}
