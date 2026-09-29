#!/usr/bin/env bash
# 태스크 폴더마다 prd.md(Acceptance 포함) · sdd.md · trace.md 가 있는지 검사한다.
# 폴더가 아닌 spec 파일(옛 단일 파일 형식)도 실패로 본다.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

fail=0
for f in agents/intent/specs/*.md; do
  [ -e "$f" ] || continue
  echo "  단일 파일 spec은 폴더로 옮겨야 합니다: $f"; fail=1
done
for d in agents/intent/specs/*/; do
  for doc in prd.md sdd.md trace.md; do
    [ -f "$d$doc" ] || { echo "  누락: $d$doc"; fail=1; }
  done
  [ -f "${d}prd.md" ] && ! grep -q "^## Acceptance" "${d}prd.md" && { echo "  Acceptance 섹션 없음: ${d}prd.md"; fail=1; }
done
exit "$fail"
