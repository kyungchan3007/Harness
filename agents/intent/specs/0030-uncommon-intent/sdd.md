# 0030 — 흔하지 않은 정답 의도로 다시 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 0027 sdd(정답 의도·숨겨진 테스트·연결 파일, 한계 "정답 의도가 흔한 선택과 겹침"), 0028·0029 sdd, `interactive.mjs`·`score-intent.mjs`
- **접근:**
  1. **정답 의도** `intent-uncommon.json`

| ID | 흔한 의도 (0027) | 흔하지 않은 의도 (0030) |
| --- | --- | --- |
| M1 | 할인 후 금액, 배송비 제외 | **할인 전 상품 합계**, 배송비 제외 |
| M2 | 내림 | **반올림** |
| M3 | 쿠폰 주문 절반 | **쿠폰 주문 적립 없음 (0)** |
| M4 | discount > 0 | discount > 0 (같음) |
| M5 | VIP 2배 | **VIP 3배** |
| M6 | grade VIP/NORMAL | 같음 |
| M7 | 2배 × 절반 | **VIP는 쿠폰이어도 3% 그대로** |

  2. **숨겨진 테스트** `oracle/points-uncommon.oracle.ts` T1~T5, 자체 검증 `oracle-check.mjs` — 기준 구현은 전부 통과, 한 곳씩 틀린 구현 6개는 노린 테스트에서만 떨어짐.
  3. **장치:** `interactive.mjs --intent uncommon`(결과 폴더 `QI-uncommon-n`), `score-intent.mjs --oracle uncommon`(결과는 `intent-score-uncommon.json`, 흔한 의도 결과를 덮지 않음). 연결 파일은 있으면 재사용.
  4. **실행:** 대화형 Haiku 3회·Opus 3회(fix #40 반영 장치, 복사본 6af14ac). 혼자 정함 구현 16개(0024 A·BR, 0025 AM·BM, 0026 Sonnet A·BR)는 재채점만.
- **대안·트레이드오프:**
  - 혼자 정함도 다시 실행: 결과가 같아야 하므로 비용 낭비 → 재채점만.
  - 정답 의도를 무작위로: 재현이 어렵다 → 고정된 흔하지 않은 값.
- **파일 계획:** `experiments/ambiguity/{intent-uncommon.json, oracle/points-uncommon.oracle.ts, oracle-check.mjs, interactive.mjs, score-intent.mjs, runs/QI-uncommon-*, runs/QI-opus-uncommon-*}`, `experiments/role-split/lib.mjs`(0030 제외)
- **위험:**
  - 이 저장소 작업 번호 0030과 실험 과제 안의 작업 번호 0030이 같음 → 복사본은 6af14ac 기준이라 이 작업 기록이 들어가지 않음(복사 후 AI가 새로 만드는 폴더).
  - 모델 쪽 거절 → `_invalid/`로 옮기고 다시.
- **검증 계획:** oracle-check, 대화 기록·분류 직접 확인, 채점, `pnpm check`

## 계획과 달라진 점
(실행 후 기록)

## 검증 결과
(실행 후 기록)
