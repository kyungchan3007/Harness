# 0028 — 큰 모델 + 대화형 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 0026 sdd(큰 모델 결과, CLI 버전 문제·모델 쪽 거절), 0027 sdd(대화형 장치·요청자 답 새어 나감 대책·숨겨진 테스트), `experiments/ambiguity/interactive.mjs`
- **접근:**
  1. `interactive.mjs`: 결과 폴더·그룹을 `groupKey("QI", model)`로(Haiku는 `QI`, Sonnet은 `QI-sonnet`). `CLAUDE_BIN`으로 CLI 지정, 실행마다 CLI 버전 기록.
  2. 실행: Sonnet 5.5 QI 3회(설치된 CLI), Opus 5.5 QI 3회(앱 내장 CLI). 요청자 분류 AI는 Sonnet 5.5(0027과 같음).
  3. 채점: `score-intent.mjs`(연결 파일 + 숨겨진 테스트 T1~T5).
  4. 지표: 점수, M1 맞춤, 물은 항목(분류 결과), 문답 횟수, 시간·비용.
- **대안·트레이드오프:**
  - Opus 제외: 비용이 줄지만 "가장 잘 묻는 모델"(0026에서 지시 없이도 멈추고 물음)이 빠짐 → 포함.
  - 요청자를 큰 모델로: 분류 정확도는 비슷할 것으로 보고 0027과 같게 유지(변수 하나).
- **파일 계획:** `experiments/ambiguity/{interactive.mjs, runs/QI-sonnet-*, runs/QI-opus-*}`, `experiments/role-split/lib.mjs`(0028 제외)
- **위험:**
  - 모델 쪽 거절·CLI 오류로 끊긴 실행 → `apiError` 확인, 끊긴 실행은 `runs/_invalid/`로 옮기고 다시.
  - 큰 모델이 문답 2번 안에 끝내지 않음 → 그대로 결과로 기록.
- **검증 계획:** 6회 실행 → 대화 기록·분류 결과 직접 확인(새어 나감 없는지) → 채점 → 연결 파일 표본 확인, `pnpm check`

## 계획과 달라진 점
(실행 후 기록)

## 검증 결과
(실행 후 기록)
