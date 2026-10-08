#!/bin/bash
# Refreshes the "Built with agents" panel from this Mac's Claude Code, Codex and
# Cursor history, and pushes the new counts so GitHub Pages redeploys.
#
# Runs from a LaunchAgent once a day (see scripts/agent-usage-refresh.plist.template).
# It works in its own detached worktree, so it never touches the checkout you are
# editing: your branch, your uncommitted changes and your index stay as they are.
# Only two generated files are ever committed, and only when the counts changed.

set -euo pipefail

REPO="${AGENT_USAGE_REPO:-$HOME/Burnes Center Fulltime/ME}"
WORK="${AGENT_USAGE_WORKTREE:-$HOME/Library/Application Support/portfolio-agent-usage/ME}"
BRANCH="${AGENT_USAGE_BRANCH:-v3}"
LOG="${AGENT_USAGE_LOG:-$HOME/Library/Logs/portfolio-agent-usage.log}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

mkdir -p "$(dirname "$LOG")" "$(dirname "$WORK")"
log() { printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*" >> "$LOG"; }
trap 'log "failed at line $LINENO"' ERR

git -C "$REPO" fetch -q origin "$BRANCH"
if [ ! -d "$WORK/.git" ] && [ ! -f "$WORK/.git" ]; then
  git -C "$REPO" worktree add -q --detach "$WORK" "origin/$BRANCH"
fi
cd "$WORK"
git checkout -q --detach "origin/$BRANCH"
git reset -q --hard "origin/$BRANCH"

# The generators need esbuild; borrow the main checkout's installs rather than keep a second copy.
[ -e node_modules ] || ln -s "$REPO/node_modules" node_modules
[ -e worker/node_modules ] || ln -s "$REPO/worker/node_modules" worker/node_modules

node scripts/agent-usage.mjs >> "$LOG" 2>&1
(cd worker && npm run --silent knowledge >> "$LOG" 2>&1)

git add src/content/agent-usage.json worker/src/knowledge.ts
if git diff --cached --quiet; then
  log "no change"
  exit 0
fi
git -c user.name="DB-25" -c user.email="dhruvbaradiya@gmail.com" commit -q -m "chore: refresh agent usage counts"
git push -q origin "HEAD:$BRANCH"
log "pushed $(git rev-parse --short HEAD)"
