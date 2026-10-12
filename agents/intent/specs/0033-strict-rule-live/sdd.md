# 0033 — 업무 값 확인 규칙으로 새로 실행 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 0025·0027·0032 sdd, `experiments/ambiguity/{run,interactive,score-intent,judge}.mjs`, `experiments/role-split/lib.mjs`(prepareCopy·누출 검사)
- **접근:**
  1. `interactive.mjs`에 `--task-id`(기본 0030)와 `--prompt`(기본 Q) 추가. 복사본 안 작업 번호를 0033으로 해서 0032 규칙이 걸리게
  2. 그룹 이름 `QI-strict` 대신 `SI`(strict + interactive), 실행 ID `SI-1~3`
  3. 복사본 기준은 이 브랜치의 커밋(0032 규칙 + 힌트 제거 포함)
  4. 판정 `judge.mjs`, 숨겨진 테스트 `score-intent.mjs`로 0025 AM·0027 QI와 같은 기준
  5. 첫 메시지에서 멈췄는지(묻고 기다림), prd 칸의 표시 변화(확인 필요·확인됨·가정), 업무 값을 낱말 없이 적은 줄을 센다
- **대안·트레이드오프:**
  - 비대화형(AM과 똑같이 한 번 실행): 막히면 거기서 끝나 점수를 못 봄 → 대화형으로, 첫 메시지로 비대화형 행동도 같이 봄
  - Q 지시로: 이미 묻게 시킨 상태라 장치 효과가 안 보임 → A 지시
- **파일 계획:** `experiments/ambiguity/{interactive.mjs, intent-lib.test.mjs 또는 새 테스트}`, `agents/harness/hooks/lib/records.test.mjs`·`agents/harness/guardrails.md`(힌트 제거), 결과 `experiments/ambiguity/runs/SI-*`
- **위험:** 복사본에 0032 예시(쿠폰·VIP)가 들어가 힌트가 됨 → 예시를 다른 도메인으로, 누출 금지어 추가. 막힌 AI가 끝없이 멈춤 → 문답 최대 3번
- **검증 계획:** 단위 테스트, 복사본 누출 검사, 실행 3회 + 판정 + 숨겨진 테스트

## 계획과 달라진 점

## 검증 결과
