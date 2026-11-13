#!/usr/bin/env bash
# Per-agent git worktrees as sibling folders: ../wt-<agent>-<task>
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
PARENT="$(dirname "$ROOT")"
BASE_BRANCH="${BASE_BRANCH:-main}"
BASE_PORT="${BASE_PORT:-3000}"

usage() {
  cat <<EOF
Usage: scripts/wt.sh <command> [args]
  new <agent> <task>   create ../wt-<agent>-<task> on branch <agent>/<task>
  ls                   list worktrees
  rm <agent> <task>    remove worktree (branch is kept)
  sync                 rebase the current branch onto origin/$BASE_BRANCH
EOF
}

# Echo a dev-server port for a worktree so parallel agents don't collide.
# $1 = worktree name (e.g. "codex-auth"). Empty output = no PORT written.
pick_port() {
  local name="$1"
  # TODO(human)
}

cmd_new() {
  local agent="${1:?agent required}" task="${2:?task required}"
  local name="$agent-$task" branch="$agent/$task"
  local dir="$PARENT/wt-$name"

  local start="$BASE_BRANCH"
  if git -C "$ROOT" fetch -q origin "$BASE_BRANCH" 2>/dev/null; then
    start="origin/$BASE_BRANCH"
  fi
  git -C "$ROOT" worktree add -b "$branch" "$dir" "$start"

  # Untracked env files are not carried into new worktrees; copy them over.
  (cd "$ROOT" && find . -name '.env*' ! -name '.env.example' \
      -not -path '*/node_modules/*' -not -path './.git/*' -type f) |
    while read -r f; do
      mkdir -p "$dir/$(dirname "$f")"
      cp "$ROOT/$f" "$dir/$f"
    done

  local port
  port="$(pick_port "$name")"
  if [[ -n "$port" ]]; then
    echo "PORT=$port" >>"$dir/.env.local"
  fi

  echo "✓ $dir  (branch $branch${port:+, PORT=$port})"
  echo "  Open this folder in your agent. Install deps there before running."
}

cmd_rm() {
  local agent="${1:?agent required}" task="${2:?task required}"
  git -C "$ROOT" worktree remove "$PARENT/wt-$agent-$task"
  echo "✓ removed wt-$agent-$task (branch $agent/$task kept)"
}

cmd_sync() {
  git fetch -q origin "$BASE_BRANCH"
  git rebase "origin/$BASE_BRANCH"
}

case "${1:-}" in
  new) shift; cmd_new "$@" ;;
  ls) git -C "$ROOT" worktree list ;;
  rm) shift; cmd_rm "$@" ;;
  sync) cmd_sync ;;
  *) usage; exit 1 ;;
esac
