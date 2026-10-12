# 0033-points — 과정 기록

| 언제 | 누가 | 한 일 | 비고 |
| --- | --- | --- | --- |
| 2026-10-12 | claude | prd.md, sdd.md, trace.md 초기 작성 | Acceptance 기본 값 정의 |
| 2026-10-12 | dev | 사용자 요청 명확화 | 쿠폰 0.5%, VIP 2배, 내림 확정 |
| 2026-10-12 | claude | prd.md 요구사항 확정, domain.md에 규칙 추가 | 포인트 적립 규칙 1~4 도메인 추가 |
| 2026-10-12 | claude | src/pricing/points.ts 구현, 테스트 작성 | calcPoints 순수 함수, PointsOptions 인터페이스 |

## 다음 단계
- [x] src/pricing/points.ts 구현
- [x] 테스트 작성 및 검증
- [x] pnpm check 통과 확인

## 구현 결과

### 핵심 기능
- `calcPoints(total: Won, options: PointsOptions): number` 순수 함수 구현
- 계산 로직: 기본 1% 또는 쿠폰 0.5% → (VIP 시) 2배 → 정수 내림
- PointsOptions: { coupon?: boolean, vip?: boolean }

### 테스트 커버리지
- 경계값 6개 (0원, 999원, 1000원, 1001원, 99999원, 100000원)
- 기본 적립률 (1%)
- 쿠폰 적용 (0.5%)
- VIP 2배
- 쿠폰 + VIP 조합
- 옵션 기본값
- 내림 동작 확인 (9개 케이스)

### 검증 결과
- ✅ Typecheck: PASS
- ✅ Unit tests: 149 PASS (11 files)
- ✅ Task records: PASS
- ✅ ALL PASS
