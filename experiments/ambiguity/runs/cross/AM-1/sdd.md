# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, harness/loop.md, context/architecture.md, context/domain.md
- **접근:**
  - `src/pricing/points.ts`: `calcPoints(total, options)` 순수 함수. 결제 금액과 옵션(쿠폰 사용 여부, VIP 여부)을 입력받아 포인트를 계산한다.
  - 포인트 계산: 결제 금액 × 기본 적립률(1%) × 쿠폰 배율(미사용 1.0, 사용 0.5) × VIP 배율(비VIP 1.0, VIP 2.0)
  - 포인트는 `number` 정수로 다루고, 소수점은 내림(floor) 처리한다.
  - 입력 경계에서 `Number.isInteger`로 검증하고, 결제 금액은 0 이상이어야 한다.
- **대안·트레이드오프:**
  - 적립률을 설정값으로: 유연성이 높지만 복잡도 증가. → 기각. 상수로 고정.
  - 포인트 계산 방식 (올림/내림/반올림): 내림이 가장 보수적이고 명확하다. → 내림 채택.
  - BigInt 사용: 오버플로우 안전성이 높지만 원화 규모에서는 불필요. → 기각. `Number.MAX_SAFE_INTEGER` 확인.
- **파일 계획:** `src/pricing/points.ts`(+test), `agents/context/domain.md` (포인트 규칙 추가), architecture.md·README 갱신
- **위험:** 결제 금액이 음수이거나 소수점일 때. → 입력 검증에서 0 이상의 정수만 허용.
- **검증 계획:** 규칙별 단위 테스트, 경계값 테스트(0원, 100원, 10000원 등), `pnpm check`

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 단위 테스트 32개, lockfile, spec Acceptance)
- 포인트 규칙 1~4: 테스트 이름에 규칙 번호를 붙여 domain.md와 1:1로 추적
- 경계값: 0원(0포인트), 1원(0포인트), 99원(0포인트), 100원(1포인트) 확인
- 쿠폰 배율: 100원 기본 1포인트 vs 쿠폰 사용 시 0포인트 (50% 감소) 확인
- VIP 배율: 100원 기본 1포인트 vs VIP 2포인트, 쿠폰+VIP 1포인트 확인
- 입력 검증: assertWon으로 음수, 소수점 거부, MAX_SAFE_INTEGER 허용 확인
- 공백: 없음
