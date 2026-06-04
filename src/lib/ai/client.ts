// Client-side helpers for talking to the local /api/ai route.

import type { AiCallResult } from "./call";

export type ClientAiInput = {
  systemPrompt: string;
  userPrompt: string;
  // The session ID from a prior `ask()` response. Pass it back and the Agent SDK continues
  // the same conversation with full context. Omit for a fresh start (or for single-shot
  // callers that have no conversation to thread).
  sessionId?: string | null;
  // Tools to allow the SDK to call. Defaults to none (text-only). Figure 5's run step
  // passes ['Edit', 'Write'] so Claude can actually edit files on the branch.
  allowedTools?: ReadonlyArray<string>;
  // Whether to use the Claude Code system-prompt preset. Defaults to false.
  // Figure 5's run step passes true (it uses Edit/Write tools and benefits
  // from the agent-loop scaffolding). Everything else is text-only Q&A and
  // saves thousands of tokens per call by leaving the preset off.
  useClaudeCodePreset?: boolean;
  // Whether to load CLAUDE.md and .claude/commands/ from cwd. Defaults to
  // false. Figures 1 and 2 pass true (the lesson is the file or the slash
  // commands).
  loadProjectContext?: boolean;
};

/**
 * Subclass for HTTP 429 — the user's own account hit a rate limit. Distinct
 * from 529 (which is platform-wide). 429 means the user has to wait or check
 * their usage; immediate retry won't help.
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/** True if the given error looks like an Anthropic 429 rate-limit response. */
export function isRateLimitError(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("429") || m.includes("rate_limit") || m.includes("rate limit")
  );
}

/**
 * Subclass for the specific case of Anthropic platform overload (HTTP 529).
 * Caught by UI surfaces so they can render a calmer "API is busy, try again"
 * affordance with a retry button instead of a red technical-error banner.
 *
 * Detected heuristically because the SDK wraps the raw 529 in a string — we
 * look for "529" or "overloaded" (case-insensitive) in the message. The
 * pattern is stable enough across SDK versions for this to be safe; if it
 * stops matching, the caller falls back to the generic error path, which is
 * the prior behavior.
 */
export class OverloadedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverloadedError";
  }
}

/** True if the given error looks like an Anthropic 529 overload. */
export function isOverloadedError(err: unknown): boolean {
  if (err instanceof OverloadedError) return true;
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return m.includes("529") || m.includes("overloaded");
}

export async function ask(input: ClientAiInput): Promise<AiCallResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The route handler expects `resumeSessionId`; client-side we call it `sessionId`
    // because callers pass the same field they previously received. Translate here.
    body: JSON.stringify({
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      resumeSessionId: input.sessionId,
      allowedTools: input.allowedTools,
      useClaudeCodePreset: input.useClaudeCodePreset,
      loadProjectContext: input.loadProjectContext,
    }),
  });
  const body = (await res.json()) as AiCallResult | { error: string };
  if (!res.ok || "error" in body) {
    const msg = "error" in body ? body.error : `request failed: ${res.status}`;
    const lower = msg.toLowerCase();
    // Promote 529 / overload messages to a typed subclass so callers can render
    // them specially. Generic errors keep the base Error type.
    if (lower.includes("529") || lower.includes("overloaded")) {
      throw new OverloadedError(msg);
    }
    // Same treatment for 429 rate-limit responses on the user's own account.
    if (
      lower.includes("429") ||
      lower.includes("rate_limit") ||
      lower.includes("rate limit")
    ) {
      throw new RateLimitError(msg);
    }
    throw new Error(msg);
  }
  return body;
}

const NOTE_JUDGE_SYSTEM = `You grade whether a Claude reply used a note the user wrote in their CLAUDE.md "## Notes". You will get a numbered list of NOTES and a REPLY. Respond in this exact format:
- First line: the number of the single note the reply most clearly drew on, reflected, or applied — paraphrasing the note or applying its idea both count; a generic mention that doesn't actually reflect the note does NOT. Use 0 if the reply draws on no note.
- If the number is not 0, a second line: copy, verbatim, the exact sentence or short phrase FROM THE REPLY that best shows that reuse — no quotation marks, no commentary.
Output only those one or two lines, nothing else.`;

export type NoteVerdict = { note: string; span: string | null };

/**
 * Figure 1's gate: ask Claude which of the user's CLAUDE.md notes (if any) a reply actually
 * drew on. Returns the matched note text PLUS a verbatim span from the reply that shows the
 * reuse (or null). Semantic — it catches paraphrase the old consecutive-word matcher missed,
 * and the span lets the highlight track the *applied* text even when Claude didn't quote the
 * note word-for-word. The caller runs it only when notes exist and passes the notes Claude
 * actually saw (the pinned snapshot). Single-shot, no session. Throws like `ask()` on
 * transport/overload errors — the caller treats that as no match (the reply is already shown).
 */
export async function judgeNoteReuse(
  notes: string[],
  reply: string,
): Promise<NoteVerdict | null> {
  const list = notes.filter((n) => n.trim());
  if (list.length === 0) return null;
  const numbered = list.map((n, i) => `${i + 1}. ${n}`).join("\n");
  const result = await ask({
    systemPrompt: NOTE_JUDGE_SYSTEM,
    userPrompt: `NOTES:\n${numbered}\n\nREPLY:\n${reply}`,
  });
  const lines = result.text.trim().split("\n");
  const m = lines[0]?.match(/\d+/);
  if (!m) return null;
  const idx = Number.parseInt(m[0], 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > list.length) return null;
  const span = lines.slice(1).join(" ").trim() || null;
  return { note: list[idx - 1], span };
}

export type SlashCommand = {
  name: string;
  description: string;
  body: string;
};

export async function listCommands(): Promise<SlashCommand[]> {
  const res = await fetch("/api/commands");
  if (!res.ok) return [];
  const body = (await res.json()) as { commands?: SlashCommand[] };
  return body.commands ?? [];
}

export async function readClaudeMd(): Promise<string | null> {
  const res = await fetch("/api/claude-md");
  if (!res.ok) return null;
  const body = (await res.json()) as { text?: string };
  return typeof body.text === "string" ? body.text : null;
}

export async function writeClaudeMd(text: string): Promise<void> {
  const res = await fetch("/api/claude-md", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to write CLAUDE.md");
  }
}

export async function readDiff(): Promise<string> {
  const res = await fetch("/api/diff");
  if (!res.ok) return "";
  const body = (await res.json()) as { diff?: string };
  return body.diff ?? "";
}

export type GitStatus = {
  branch: string | null;
  clean: boolean;
  available: boolean;
};

export async function gitStatus(): Promise<GitStatus> {
  const res = await fetch("/api/git");
  if (!res.ok) return { branch: null, clean: false, available: false };
  return (await res.json()) as GitStatus;
}

export type GitActionResult = { ok: true } | { ok: false; error: string };

export async function gitAction(
  action: "branch" | "merge" | "discard",
  name: string,
  // The branch to return to (and merge into). Required for merge/discard, ignored for
  // branch. This is whatever branch the user was on when they started F5 — not always
  // `main`, since a real user may already be working on their own branch.
  baseBranch?: string,
): Promise<GitActionResult> {
  const res = await fetch("/api/git", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      name,
      ...(baseBranch ? { baseBranch } : {}),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || body.ok === false) {
    return {
      ok: false,
      error: body.error ?? `git ${action} failed (${res.status})`,
    };
  }
  return { ok: true };
}

/**
 * How Claude is authenticated on the dev server's machine. See
 * `/api/auth-status/route.ts` for the three configurations.
 */
export type AuthStatus = {
  hasApiKey: boolean;
  hasCli: boolean;
  cliVersion: string | null;
};

export async function authStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch("/api/auth-status");
    if (!res.ok) return { hasApiKey: false, hasCli: false, cliVersion: null };
    return (await res.json()) as AuthStatus;
  } catch {
    return { hasApiKey: false, hasCli: false, cliVersion: null };
  }
}
