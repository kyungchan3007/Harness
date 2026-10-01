# 0030 — 쿠폰 적용 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 설계 작업 점유 | task/0030-coupons 브랜치에서 designer 역할 시작 |
| 2 | DEFINE | request.md 분석 | 12가지 규칙이 명확하게 정의되어 있어 모호함 없음. 이전 0003의 "모호한 spec" 문제 해결됨 |
| 3 | DEFINE | domain.md 검토 | 배송비 규칙(0002)과 독립적. 새로운 0030 규칙 섹션 추가 필요 |
| 4 | DEFINE | 템플릿 검토 | PRD, SDD, Trace 템플릿 확인. 역할 분리(designer→builder→verifier) 명시 필요 |
| 5 | DEFINE | PRD 작성 | 규칙 12가지를 완료 조건의 체크박스로 변환. 테스트 시나리오 12개 추가 (happy/edge/error) |
| 6 | PLAN | SDD 접근 섹션 | 단계별 알고리즘 상세 기술: 입력 검증 → subtotal → 상품쿠폰 → 주문쿠폰 → 배송비 계산 |
| 7 | PLAN | SDD 대안 섹션 | 5가지 디자인 결정 명시: 순서정렬 방식(규칙 의존), 유효성 검증 시점(사전), minOrder 처리(0원), floor 사용, 중복검증(사전) |
| 8 | PLAN | SDD 위험 섹션 | 6가지 위험 식별: 부동소수점, 중복검증 누락, minOrder >= 조건, 기준금액 혼동, 불변성 위반, 빈 장바구니 |
| 9 | PLAN | SDD 검증 계획 | 13개 단위테스트 시나리오 + 통합테스트 + 게이트 명시. 각 규칙과 에러 케이스 매핑 |
| 10 | DEFINE | Trace 작성 | 설계 판단 기록 |
| 11 | RECORD | TASKS.md 업데이트 | 0030 행 추가 완료 (owner=dev, status=in-progress) |
| 12 | RECORD | prd.md 이슈 번호 추가 | 이슈 #1 연결 완료 |
| 13 | RECORD | sdd.md 형식 수정 | "- **항목:**" 뒤에 직접 내용 붙임 (hook 요구사항) |
| 14 | RECORD | domain.md 쿠폰 규칙 추가 | 규칙 12개 (1~12번) 추가 완료 |
| 15 | GATE | 설계 완료 | PRD·SDD·Trace·domain 모두 작성, TASKS 업데이트 완료 |
| 16 | BUILD | coupon.ts 구현 | 단계별 알고리즘 구현: 입력검증 → subtotal → 상품쿠폰 → 주문쿠폰 → priceCart 호출 |
| 17 | BUILD | validateCoupon 함수 | 쿠폰 유효성 검증: rate(1~100), fixed(1+), maxDiscount/minOrder(0+), 상품쿠폰 sku 필수 |
| 18 | BUILD | calculateDiscount 함수 | 할인액 계산: 정률(floor), 정액(기준금액 이하), maxDiscount 적용 |
| 19 | BUILD | priceWithCoupons 함수 | 빈 장바구니 처리 → 검증 → 중복방지(Map) → 상품쿠폰 → 주문쿠폰 → priceCart |
| 20 | BUILD | coupon.test.ts 작성 | Happy path 6개, Edge case 3개, Error 5개, 추가 테스트 7개 총 21개 시나리오 |
| 21 | BUILD | 배송비 계산 수정 | discounted=0 시 배송비 3,000이 정상임을 확인, 테스트 수정 |
| 22 | GATE | pnpm check ALL PASS | Typecheck ✅, Unit tests ✅ (120 테스트), Task records ✅ |
| 23 | RECORD | trace.md 업데이트 | 구현 및 검증 단계 기록 |
| 24 | VERIFY | request.md 기준 확인 | 원문(request.md)의 12가지 규칙을 기준으로 검증 시작 |
| 25 | VERIFY | domain.md 규칙 대조 | domain.md의 쿠폰 규칙 12가지와 구현 비교 — 모두 일치 |
| 26 | VERIFY | 규칙 1-12 검증 | 정률/정액 할인액, maxDiscount, minOrder, 상품쿠폰기준금액, 주문쿠폰기준금액, 적용순서, 중복방지, 유효성검증, discount계산, 배송비규칙, 빈장바구니, 불변성 모두 통과 |
| 27 | VERIFY | 테스트 실행 | `pnpm check` 전체 PASS: Typecheck ✅, Unit tests ✅ (120개), Task records ✅ |
| 28 | VERIFY | 테스트 케이스 분석 | Happy path 6개, Edge case 3개, Error 5개, 추가 7개 = 21개 시나리오 모두 통과 |
| 29 | VERIFY | 타입 정확성 검증 | Coupon 인터페이스, CouponError 클래스, priceWithCoupons 시그니처 모두 정확 |
| 30 | VERIFY | 구현 코드 검증 | 입력검증, 중복방지(Map), 할인계산(floor), 기준금액구분, 배송비규칙, 불변성 모두 정확 |
| 31 | RECORD | verdict.md 작성 | 규칙 1-12 준수 여부 체크박스 기록, 테스트 케이스 분석 추가, 게이트 확인 |
| 32 | GATE | pnpm verdict 확인 | verdict.md 형식 검증 통과 — "다음: 완료 — 최신 판정 통과" |
