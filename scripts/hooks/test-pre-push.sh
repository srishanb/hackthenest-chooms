#!/usr/bin/env bash
# Tests .githooks/pre-push against a throwaway bare repo and clones. Exits non-zero on any
# wrong outcome. Run in CI and by hand: bash scripts/hooks/test-pre-push.sh
set -u

HOOKS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.githooks" && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/pre-push-test.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
failures=0

pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; failures=$((failures + 1)); }

expect_ok() { # description, command...
  local desc="$1"; shift
  if out="$("$@" 2>&1)"; then pass "$desc"; else fail "$desc"; echo "$out"; fi
}
expect_refused() {
  local desc="$1"; shift
  if out="$("$@" 2>&1)"; then fail "$desc (push succeeded)"; else
    if grep -q "REFUSED" <<<"$out"; then pass "$desc"; else fail "$desc (failed, but not by the hook)"; echo "$out"; fi
  fi
}

setup_clone() { # dir
  git clone -q "$WORK/remote.git" "$1" 2>/dev/null
  git -C "$1" config user.email ci@example.invalid
  git -C "$1" config user.name ci
  git -C "$1" config commit.gpgsign false
  git -C "$1" config core.hooksPath "$HOOKS"
}

git init -q --bare "$WORK/remote.git"
git -C "$WORK/remote.git" symbolic-ref HEAD refs/heads/main
setup_clone "$WORK/a"
cd "$WORK/a" || exit 1
git checkout -q -b main
echo 1 >f && git add f && git commit -q -m one
expect_ok "first push of main (new ref)" git push -q -u origin main

echo 2 >f && git commit -q -am two
expect_ok "fast-forward push" git push -q origin main

git checkout -q -b feature
echo 3 >g && git add g && git commit -q -m three
expect_ok "push a new branch" git push -q -u origin feature

git checkout -q main
git commit -q --amend -m "two, rewritten"
expect_refused "force push of rewritten history" git push --force origin main
expect_refused "force push with +refspec" git push origin +main
expect_refused "force-with-lease push of rewritten history" git push --force-with-lease origin main

expect_refused "delete a remote branch" git push origin --delete feature
expect_refused "delete a remote branch with :refspec" git push origin :feature

# Remote has a commit this clone has never fetched: a force push must be refused.
setup_clone "$WORK/b"
git -C "$WORK/b" checkout -q main
echo b >"$WORK/b/b" && git -C "$WORK/b" add b && git -C "$WORK/b" commit -q -m from-b
git -C "$WORK/b" push -q origin main
git checkout -q -B scratch origin/main 2>/dev/null
echo c >c && git add c && git commit -q -m from-a
expect_refused "force push over a commit not known locally" git push --force origin scratch:main

# Recover the right way: merge, then a normal push works.
git fetch -q origin
git checkout -q main
git merge -q --no-edit origin/main 2>/dev/null
expect_ok "push after merging origin/main" git push -q origin main

echo
if [ "$failures" -eq 0 ]; then echo "all pre-push checks passed"; else echo "$failures pre-push check(s) failed"; exit 1; fi
