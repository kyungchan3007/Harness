# 0030 — 쿠폰 적용 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 설계자 역할 확인, task/0030-coupons 브랜치 확인 | AGENTS.md에 따라 완료 전 게이트는 `pnpm check` PASS |
| 2 | DEFINE | request.md 읽기 (원문) | 원문이 기준. 요청 본문을 그대로 옮김. 이슈 #1 지정 |
| 3 | DEFINE | domain.md 읽기 | 기존 도메인 규칙(용어, 장바구니, 배송비)을 이해. 쿠폰 규칙은 요청에 명시된 12개 규칙 따름 |
| 4 | DEFINE | 템플릿 읽기 (prd, sdd, trace) | 스타일 일관성 유지. 0002 스펙도 참고해서 규칙 번호와 Acceptance 체크박스 형식 맞춤 |
| 5 | DEFINE | prd.md 작성 | 12개 규칙을 Acceptance으로 분류, 각 규칙마다 구체적인 테스트 케이스 명시. 요청에 "완료 조건" 섹션이 있지만 prd.md의 Acceptance으로 확장해서 구체적으로 함 |
| 6 | DEFINE | sdd.md 작성 | 읽은 문서, 접근, 파일 계획, 위험, 검증 계획 정의. coupon.ts 신규 파일, coupon.test.ts 테스트 파일 계획 |
| 7 | DEFINE | trace.md 작성 | 이 파일. 판단과 이유 기록 |
| 8 | PLAN | domain.md 쿠폰 규칙 추가 계획 | 기존 도메인 문서에 규칙 번호 (0030) 붙여서 추가 |
| 9 | PLAN | TASKS.md 0030 행 추가 계획 | 이미 0003 행이 있지만 (모호한 spec), 0030이 정식 쿠폰 기능 태스크. 새 행 추가: owner=?, status=in-progress |

## 주요 설계 결정

### 원문에 없음 — 설계 결정
- Acceptance 형식: 요청의 "완료 조건" 섹션(규칙 나열)을 12개 규칙으로 분류해서 체크박스로 명시 (테스트로 확인 가능하게)
- 파일 계획: coupon.ts와 coupon.test.ts 분리, 내부 헬퍼 함수들 (유효성, 할인액 계산) 설계
- 위험 항목: 순서, 정확도, 중복, 배송비, 불변성 5가지 위험 식별

### 원문 그대로 옮김
- Coupon 인터페이스 형태 (scope, sku?, type, value, maxDiscount?, minOrder?)
- CouponError 클래스 정의
- priceWithCoupons 함수 시그니처
- 12개 규칙 전부 (1. 정률 버림, 2. 정액 상한, 3. maxDiscount, 4. minOrder 조건, 5. 상품쿠폰 기준금액, 6. 주문쿠폰 기준금액, 7. 순서, 8. 중복, 9. 유효성, 10. discount 결과, 11. 빈 장바구니, 12. 입력 불변성)
- domain.md 참조 (배송비 규칙, 용어)

## BUILD 단계

### 구현자(builder) 실행 기록

| 순서 | 작업 | 판단·이유 |
| --- | --- | --- |
| 1 | src/pricing/coupon.ts 작성 (Coupon 인터페이스, CouponError, priceWithCoupons 함수) | 요청 그대로 인터페이스 작성. 12개 규칙을 함수에 구현 |
| 2 | 헬퍼 함수 설계: validateCoupon, validateCoupons, calculateDiscount | 유효성 검증과 할인액 계산을 별도 함수로 분리해서 재사용성 높임 |
| 3 | 실행 흐름: 입력 검증 → 빈 장바구니 확인 → 상품쿠폰 → 주문쿠폰 → PriceBreakdown | 규칙 7(순서) 강제를 위해 scope별 필터링으로 처리 |
| 4 | src/pricing/coupon.test.ts 작성 (12개 규칙별 43개 테스트) | 규칙별로 정상/경계/오류 케이스를 체계적으로 테스트 |
| 5 | 첫 pnpm check 실패: 타입 에러 (sku: undefined, 빈 배열 타입) | readonly Coupon[] 타입 명시 및 Coupon 객체 생성으로 해결 |
| 6 | 두 번째 pnpm check 실패: 테스트 2개 실패 (배송비 기대값 오류) | 테스트 계산 재검토: 할인 후 금액 >= 50000일 때 배송료 무료 규칙 적용 |
| 7 | 배송비 테스트 수정: 상품 금액을 60000 및 55556으로 조정해서 할인 후 >= 50000 만족 | 테스트 이름과 기대값을 일치시킴 |
| 8 | 마지막 pnpm check: 모든 검사 PASS (typecheck, unit tests, task records) | 구현 완료 |

### 구현 결정사항

- **유효성 검증 시점:** 함수 시작 시 전체 검증 (부분 적용 방지)
- **할인액 계산 버림:** Math.floor 사용 (규칙 1)
- **minOrder 미충족:** 오류 아니라 할인 0원 (규칙 4)
- **상품/주문 쿠폰 순서:** 입력 순서 무시하고 scope별 필터링으로 강제 (규칙 7)
- **배송비 계산 재사용:** priceCart 함수 활용 (domain.md 규칙 준수)

## VERIFY 단계

### 검사자(verifier) 실행 기록

| 순서 | 작업 | 판단·이유 |
| --- | --- | --- |
| 1 | request.md 읽기 (원문) | 원문이 판정의 기준. 12개 규칙 확인 |
| 2 | prd.md, domain.md 읽기 | prd.md와 domain.md 모두 request.md와 일치 확인 |
| 3 | src/pricing/coupon.ts 읽기 | 구현 전체 검토: 인터페이스, CouponError, 3개 헬퍼 함수, priceWithCoupons 함수 |
| 4 | src/pricing/coupon.test.ts 읽기 (148개 테스트) | 규칙별 테스트 40개 + 통합 3개 확인 |
| 5 | pnpm check 실행 | 모든 검사 PASS: typecheck ✅, unit tests 148개 ✅, lockfiles ✅, task records ✅ |
| 6 | 규칙별 대조 (12개) | 각 규칙마다 구현 코드 줄수와 테스트 케이스 명시적 확인 |
| 7 | verdict.md 작성 | 게이트 검증, 규칙별 검증, 원문 대조, 경계값 검증 기록. "판정: approved" |
| 8 | pnpm verdict 실행 | 판정서 형식 검증 완료, "완료 — 최신 판정 통과" 확인 |

### 검증 결과

**최종 판정: APPROVED**

- 모든 규칙(12개) 구현 완료
- 규칙별 테스트(40개) + 통합 테스트(3개) + 기타 = 148개 테스트 모두 통과
- pnpm check ALL PASS (typecheck, unit tests, no lockfiles, task records)
- 원문(request.md)과 구현·테스트가 100% 일치
- 경계값·오류·통합 케이스 모두 검증됨
- verdict.md 형식 유효성 확인
