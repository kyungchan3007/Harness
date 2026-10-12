# 0034 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** domain.md (적립 규칙), AGENTS.md
- **접근:**
  - 포인트 계산을 `src/pricing/points.ts`에 순수 함수로 구현
  - 함수 서명: `calculatePoints(total: number, hasCoupon: boolean, isVip: boolean): number`
  - 적립률: 기본 1%, VIP 시 2배, 쿠폰 시 절반, VIP+쿠폰은 순서대로 (2% → 1%)
  - 포인트는 floor로 정수 처리, 1포인트 미만은 버림
- **대안·트레이드오프:**
  - Round vs Floor: Floor 선택 (사용자가 "1포인트 단위"로 표현, 내림이 공정)
  - 함수 분리: 하나로 통합 (로직이 단순, 추후 Order 도메인과 연결 시 재검토)
  - 적용 순서: VIP 먼저, 그 다음 쿠폰 (선택) → 사용자 확정값 사용
- **파일 계획:** `src/pricing/points.ts`(+test), `agents/context/domain.md` 규칙 추가
- **위험:** 없음 (순수 함수, 입력은 항상 0 이상의 정수)
- **검증 계획:** 
  - 단위 테스트 8가지 (기본, 쿠폰, VIP, VIP+쿠폰, 경계값)
  - 모든 경로 커버 확인
  - `pnpm check` ALL PASS

## 테스트 케이스

| total | hasCoupon | isVip | 예상 적립률 | 예상 포인트 |
| --- | --- | --- | --- | --- |
| 0 | false | false | 1.0% | 0 |
| 100,000 | false | false | 1.0% | 1,000 |
| 99,999 | false | false | 1.0% | 999 |
| 80,000 | true | false | 0.5% | 400 |
| 100,000 | false | true | 2.0% | 2,000 |
| 100,000 | true | true | 1.0% | 1,000 |
| 1 | false | false | 1.0% | 0 |
| 50,000 | false | false | 1.0% | 500 |

## 검증 결과
- `pnpm check`: ✅ ALL PASS (Typecheck, 단위 테스트 138개, lockfile, spec Acceptance)
- 테스트 커버리지: 9가지 (기본 5, 쿠폰 1, VIP 1, VIP+쿠폰 1, 입력 검증 2)
- 도메인 규칙 추적: domain.md 포인트 규칙 1~6 모두 코드와 테스트에서 추적 가능
