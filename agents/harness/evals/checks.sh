#!/usr/bin/env bash
# 완료 게이트 — 모든 에이전트 공통. 하나라도 실패하면 non-zero 종료.
# 사용법:  bash agents/harness/evals/checks.sh   (또는 pnpm check)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

FAIL=0
run() {
  local name="$1"; shift
  echo ""
  echo "▶ $name"
  echo "  \$ $*"
  if "$@"; then
    echo "  ✅ PASS — $name"
  else
    echo "  ❌ FAIL — $name"
    FAIL=1
  fi
}

echo "════════════════════════════════════════"
echo " harness-lab 완료 게이트"
echo "════════════════════════════════════════"

run "Typecheck" pnpm exec tsc --noEmit
run "Unit tests" pnpm exec vitest run
run "No npm/yarn lockfiles" bash -c '! find . -type d -name node_modules -prune -o -type f \( -name package-lock.json -o -name yarn.lock \) -print | grep -q .'
run "Every spec has Acceptance" bash -c 'for f in agents/intent/specs/*.md; do grep -q "^## Acceptance" "$f" || { echo "  누락: $f"; exit 1; }; done'

# ── 새 검사는 위 형식으로 한 줄씩 추가 (실험 결과는 LEARNINGS.md에) ──

echo ""
echo "════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo " 결과: ✅ ALL PASS — 완료 선언 가능"
else
  echo " 결과: ❌ FAIL — 완료 선언 금지"
fi
echo "════════════════════════════════════════"
exit "$FAIL"
