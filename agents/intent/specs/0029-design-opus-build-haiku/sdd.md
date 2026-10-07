# 0029 — 설계 Opus + 구현 Haiku 조합 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 0016 sdd(요약 전달 시 46%), 0022 sdd(원문 고정), 0027·0028 sdd(대화형 장치·결과·비용), `experiments/ambiguity/interactive.mjs`
- **접근:**
  1. `runInteractive({ buildModel })` 조합 모드
     - 설계 단계: 0027·0028과 같은 시작(Q 지시) → 질문 → 요청자 답(분류 AI + 코드 조립). 답 뒤에 "문서까지만, 코드는 쓰지 마세요 — 다른 개발자가 이 문서만 보고 구현"을 붙여 이어 감.
     - 구현 단계: 같은 복사본에서 **새 대화**로 구현 모델 실행. 지시는 "태스크 폴더 문서를 읽고 그대로 구현" 한 줄 — 대화 요약은 넘기지 않음.
     - 설계 모델이 지시를 어기고 코드를 썼는지 `designedCode`로 기록.
  2. `phaseUsage`: 각 `claude -p` 결과의 비용·요청 수(num_turns)·토큰(입력·캐시 쓰기·캐시 읽기·출력)을 `phases`에 저장.
  3. 채점: `score-intent.mjs`(숨겨진 테스트 T1~T5). 문서 직접 읽기: Opus가 문서에 적은 값 vs Haiku 구현 값 — 문서에 없는 것을 지어냈는지.
- **대안·트레이드오프:**
  - 역할 분리(designer·builder 보조 에이전트)로: 실제 구조에 가깝지만 조율 AI가 끼어 요약 전달 변수가 생김 → 문서 파일만으로 넘기는 단순한 형태로 변수 하나만.
  - 구현 지시에 "모호하면 물어보라" 추가: 넣으면 Haiku가 물을 수 있지만 "문서만으로 충분한가"를 못 봄 → 넣지 않음.
- **파일 계획:** `experiments/ambiguity/{interactive.mjs, intent-lib.test.mjs, runs/MIX-opus-haiku-*}`, `experiments/role-split/lib.mjs`(0029 제외)
- **위험:**
  - Opus가 문서 단계에서 코드까지 씀 → `designedCode`로 기록, 그대로면 결과에서 구분.
  - 모델 쪽 거절·CLI 오류 → `apiError` 확인, `_invalid/`로 옮기고 다시.
- **검증 계획:** phaseUsage 단위 테스트, 3회 실행 → 대화·문서 직접 확인 → 채점, `pnpm check`

## 계획과 달라진 점
(실행 후 기록)

## 검증 결과
(실행 후 기록)
