# Loop — 작업 루프

```
1. CLAIM    TASKS.md에서 owner=나, status=in-progress
2. DEFINE   intent/specs/NNNN-슬러그/prd.md → 왜/무엇 + Acceptance
3. PLAN     같은 폴더 sdd.md → 접근·대안·트레이드오프·파일 계획·검증 계획
4. BUILD    Guardrails를 지키며 작게 구현 + 단위 테스트
5. GATE     pnpm check → PASS까지 반복
6. RECORD   sdd.md에 "계획과 달라진 점"·검증 결과, JOURNAL.md 한 줄, Acceptance 갱신, TASKS.md status=done
7. REFLECT  드러난 규칙·문서 공백을 Intent/Context에 반영, 실험이면 LEARNINGS.md 기록
```

**1~7 내내:** `trace.md`에 판단·이유·막힘·되돌림을 직접 남긴다. 도구 호출은 hooks가 `trace.auto.jsonl`에 자동으로 남긴다(브랜치가 `task/NNNN-*`일 때). 템플릿: [templates/](../intent/templates/)

**강제:** 1~3을 건너뛰고 코드를 고치면 hook이 막고, trace 없이 끝내려 하면 돌려보낸다. 자세한 내용은 [guardrails.md](guardrails.md#자동-강제-hooks게이트-0009).

## 막혔을 때

- 게이트가 계속 실패하면 검사를 약화하지 말고 원인부터 진단한다.
- Acceptance를 못 맞추면 status=`blocked` + 사유를 JOURNAL에 기록한다. "done" 금지.
