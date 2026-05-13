// Shared metadata about this repo as a teaching artifact. Hand-off panels reference these
// constants so the clone URL and the practice command live in one place.
//
// Update REPO_CLONE_URL once the public GitHub URL is set.

export const REPO_CLONE_URL =
  process.env.NEXT_PUBLIC_REPO_CLONE_URL ??
  'https://github.com/<your-username>/dancing-with-claude.git'

export const REPO_LOCAL_DIR = 'dancing-with-claude/prototype'

export function handoffCommands(): string {
  return [
    `git clone ${REPO_CLONE_URL}`,
    `cd ${REPO_LOCAL_DIR}`,
    `npm install`,
    `claude`,
  ].join('\n')
}
