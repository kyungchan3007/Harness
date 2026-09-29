# Loop — 작업 루프

```
1. CLAIM    TASKS.md에서 owner=나, status=in-progress
2. DEFINE   intent/specs/NNNN-슬러그.md 생성 → PRD(왜/무엇 + Acceptance)
3. PLAN     같은 파일에 SDD(접근·대안·트레이드오프·파일 계획·검증 계획)
4. BUILD    Guardrails를 지키며 작게 구현 + 단위 테스트
5. GATE     pnpm check → PASS까지 반복
6. RECORD   JOURNAL.md append, Acceptance 체크박스 갱신, TASKS.md status=done
7. REFLECT  드러난 규칙·문서 공백을 Intent/Context에 반영, 실험이면 LEARNINGS.md 기록
```

## 막혔을 때

- 게이트가 계속 실패하면 검사를 약화하지 말고 원인부터 진단한다.
- Acceptance를 못 맞추면 status=`blocked` + 사유를 JOURNAL에 기록한다. "done" 금지.
