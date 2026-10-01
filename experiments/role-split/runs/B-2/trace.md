# 0030 — 쿠폰 할인 기능 — Trace

## Designer (2026-10-01)

### 작업 단계
- [x] domain.md에 쿠폰 규칙 12개 추가
- [x] prd.md 작성 (개요, 사용자 스토리, 요구사항, Acceptance)
- [x] sdd.md 작성 (고수준 설계, 알고리즘 상세, 에러 조건, 테스트 전략)
- [x] trace.md 초기화

### 설계 결정

#### 입력/출력 설계
- `priceWithCoupons(items, coupons, shippingPolicy)` 함수 선택
- PriceBreakdown에 discount 필드 추가 (기존 0002 구조 유지)
- 쿠폰 유효성 검사 실패 시 CouponError 발생

#### 할인 계산 규칙
- 정률 쿠폰: `Math.floor()` 사용 (원 미만 버림)
- 정액 쿠폰: `maxDiscount` 제한 적용
- 적용 순서: 상품쿠폰 → 주문쿠폰 (고정, 상호 순서 영향 없음)

#### 중복 제한 처리
- 상품당 상품쿠폰 1장: 같은 sku에 2장 이상이면 E8 에러
- 주문당 주문쿠폰 1장: scope=ORDER 2장 이상이면 E9 에러
- 쿠폰 id 중복: 같은 id 2번 이상이면 E10 에러

#### minOrder 미달 처리
- 조건 미충족 시 "에러"가 아닌 "미적용" 처리
- PriceBreakdown에서 해당 쿠폰은 discount에 포함되지 않음

### 도메인 규칙 추가 사항
domain.md에 다음 섹션 추가:
- 쿠폰 구조 (테이블)
- 할인 계산 규칙 (12개)
- 제약 및 검증 (7개, 규칙 7~12 + 추가)

## Builder (2026-10-01)

### 구현 완료

| 파일 | 내용 | 라인 수 | 테스트 |
| --- | --- | --- | --- |
| src/pricing/coupon.ts | Coupon 인터페이스, CouponError, priceWithCoupons 함수 | 355 | - |
| src/pricing/coupon.test.ts | 48개 테스트 (정률/정액, 상품/주문, 중복, minOrder, 엣지케이스, 불변성) | 650 | ALL PASS |

### 구현 결정

1. **파일 구조**: coupon.ts에 인터페이스, 에러, 함수를 통합하여 단순화
2. **할인 계산**: 정률은 Math.floor 사용, 정액은 min(value, maxDiscount)로 제한
3. **적용 순서**: 유효성 검사 → 중복 검사 → 상품쿠폰 → 주문쿠폰 → 배송비 계산
4. **minOrder 미달**: 에러가 아닌 미적용 처리 (설계 준수)
5. **입력 불변성**: readonly 유지, 내부 수정 없음
6. **배송비**: 할인 후 상품합계 기준 적용 (0002 규칙 준수)

### 테스트 커버리지

- **정률/정액 쿠폰** (규칙 1, 2): 기본, 버림, maxDiscount 제한
- **상품/주문 쿠폰** (규칙 3, 4): 기준액 계산, 적용 순서
- **중복 제한** (규칙 7, 8, 9): sku당 1장, 주문당 1장, id 중복
- **minOrder 조건** (규칙 10): 충족/미충족 시 적용/미적용
- **유효성 검사** (E1~E11): type, scope, value, maxDiscount, minOrder, sku, 할인액 상한
- **통합 테스트**: 여러 상품 + 여러 쿠폰 조합
- **엣지 케이스**: 빈 장바구니, 없는 상품, 경계값, 수량
- **불변성**: items, coupons, 결정성

### 이슈 및 해결

1. **TypeScript exactOptionalPropertyTypes**: Coupon 인터페이스의 sku를 `sku?: string | undefined`로 명시 후 testOrderCoupon 헬퍼 추가
2. **Map 처리**: productCouponDiscount를 Map으로 사용하되, Array.from(map.values())로 변환하여 합산

## Verifier (2026-10-01)

### 검증 완료

| 항목 | 결과 |
| --- | --- |
| 인터페이스 정의 | ✅ PASS (Coupon, CouponError, priceWithCoupons) |
| 12개 할인 규칙 | ✅ PASS (정률/정액, 기준액, 적용 순서, 중복, 유효성, 배송비) |
| 11개 에러 조건 | ✅ PASS (E1~E11 모두 구현) |
| 테스트 커버리지 | ✅ PASS (48개 테스트, SDD 요구 40개 초과) |
| 불변성 | ✅ PASS (items, coupons readonly) |
| pnpm check | ✅ ALL PASS (Typecheck, 141 tests, Task records) |

### 최종 판정

**상태: APPROVED**

- 구현이 prd.md의 모든 요구사항 충족
- sdd.md의 알고리즘 설계 정확히 구현
- 모든 에러 조건 처리
- 48개 테스트 모두 통과
- TypeScript 타입 안전성 확보
- 배송비 규칙(0002) 정확히 통합

판정서: agents/intent/specs/0030-coupons/verdict.md
