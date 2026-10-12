# 0033 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, domain.md, 0002 prd/sdd (참고)
- **접근:**
  - `src/pricing/points.ts`: `calcPoints(total: number, options: PointsOptions) => number` 순수 함수
  - 입력: 결제 금액(원), 쿠폰 사용 여부, VIP 여부
  - 계산: 기본 1% → 쿠폰이면 0.5% → VIP이면 2배 → 정수 내림
  - domain.md에 포인트 규칙 4개 추가 (기본율, 쿠폰 할인, VIP 배수, 정수 단위)
- **대안·트레이드오프:**
  - 쿠폰/VIP 조건을 분리 vs. 통합: 분리하면 재사용성 높지만 계산 순서가 중요. → 순서를 문서화 (할인율 먼저, 배수 나중)
  - 정수 내림 vs. 반올림: 프로모션에서는 보수적으로. → 내림(Math.floor) 사용
  - Options를 객체 vs. 개별 인자: 확장성 위해 → 객체 사용
- **파일 계획:** `src/pricing/points.ts`(+test), agents/context/domain.md 갱신
- **위험:** 포인트가 음수가 되는 경우는 없다 (결제 금액이 항상 0 이상). 그러나 입력 검증은 문서 단계에서만 (호출자가 이미 검증한 것으로 가정)
- **검증 계획:** 경계값별 단위 테스트 (0원, 999원, 1000원, 1001원, 99999원, 100000원 각각), 쿠폰/VIP 조합 테스트, `pnpm check`

## 검증 결과
*진행 중*
