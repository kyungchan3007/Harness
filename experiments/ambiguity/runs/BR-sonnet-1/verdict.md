# 0030 — 판정서

## 1차 · 2026-10-05
판정: approved
### 근거
- (반려 아님)
### 확인한 것
- `pnpm check` 직접 실행: Typecheck·Unit tests(11 파일, 146 tests)·lockfile·Task records 모두 ALL PASS.
- prd Acceptance 대조 (코드 `src/pricing/points.ts`, 테스트 `src/pricing/points.test.ts`):
  - 기본 1%, 10,000→100: points.ts 25~30행(regular.standard 100), 88~93행 / 테스트 37~40행 ✓
  - 내림 경계 99→0, 100→1, 199→1, 200→2: 테스트 42~47행. 직접 계산 `q·rate + floor(r·rate/10000)`는 floor(total·rate/10000)와 동치(q·rate 정수) ✓
  - total 0 → 전 조합 0: 테스트 49~54행 ✓
  - 쿠폰 10,000→50, 199→0, 200→1, discount 0은 쿠폰 아님: points.ts 88행 `discount > 0`, 테스트 56~66행 ✓
  - VIP 10,000→200, 49→0, 50→1: 테스트 68~73행 ✓
  - VIP+쿠폰은 표 칸 직접 조회(곱셈 아님) 10,000→100, 99→0, 100→1: 테스트 75~87행. 요율 곱 조합이 아님을 비기본 정책(vip 400/300 → 300)으로 확인하는 점이 강함 ✓
  - 배송비 포함 total: priceCart 40,000→43,000→430, 쿠폰 1,000→42,000→210, 50,000→500, 빈 장바구니 0: 테스트 89~107행 ✓
  - 정수·0 이상·MAX_SAFE_INTEGER: 직접 계산 확인. q=900719925474, r=991, rate 100 → 90071992547400 + floor(99100/10000)=9 → 90071992547409 ✓(테스트 123~128행, 4칸 모두 단언). 1~2,000 전수 대조(130~138행), 결과 ≤ total 단언 포함 ✓
  - 입력 검증: assertWon 재사용(points.ts 80~81행), 음수·소수·NaN·2**53·Infinity 각각 total·discount 테스트(141~150행). 미지의 등급은 `Object.hasOwn`(82행)으로 "toString"·""까지 거부, 테스트 152~156행 ✓
  - 정책 주입(3%→300): 테스트 160~169행. 요율 0·10,000 경계 허용 171~179행 ✓
  - 정책 검증: assertPointsPolicy(49~71행) 12개 위반 케이스가 모두 assertPointsPolicy와 calculatePoints에서 RangeError(181~201행). 범위 밖(-1, 10,001), 소수, NaN, 쿠폰≥일반(같음/높음) 각 등급, vip≤regular(같음/낮음) 각 쿠폰 여부 포함 ✓
  - DEFAULT_POINTS_POLICY가 domain.md 표(100/50/200/100)와 일치하고 테스트가 toEqual로 단언(21~29행) ✓
  - 기존 코드 무변경: `git status`에서 price-cart.ts·cart.ts 수정 없음(변경은 domain.md·TASKS.md 문서와 신규 파일뿐) ✓
- 테스트 품질: 약한 단언(`toBeDefined` 류) 없음. 정확한 값·경계 입력 사용. 코드와 domain.md 규칙 1~9의 동작 차이 없음.
- 문서 문제: 없음. (경미한 참고: sdd.md의 "계획과 달라진 점"·"검증 결과" 칸은 아직 미작성 — 완료 조건 아님.)
### 원문 대조
- 원문 "결제 금액의 1%를 포인트로 적립" ↔ points.ts 기본 요율 100bp, 기준 금액 `total`(배송비 포함은 가정으로 domain.md 규칙 2·prd 질문 2에 표시) ✓
- 원문 "쿠폰을 쓴 주문은 적립을 좀 줄여" ↔ withCoupon 요율 50bp, 정책 검증이 쿠폰 요율 < 일반 요율을 강제(57~64행). 수치 0.5%는 domain.md 표·prd 가정표에서 **(가정)**으로 표시, 요청자 질문 1에 올림 — 확정 사실로 쓰이지 않음 ✓
- 원문 "VIP 회원은 더 많이 적립" ↔ vip 200/100bp, 정책 검증이 vip > regular 강제(65~70행). VIP 2%와 VIP+쿠폰 1%는 **(가정)**으로 표시, 질문 1·4에 올림. 코드 주석(24행)에도 "regular.standard만 원문 확정, 나머지는 가정" 명시 ✓
- 원문 "1포인트 단위(정수)" ↔ 내림 정수 연산(91~93행), 테스트 109~121행. 내림 선택은 가정으로 표시(질문 5) ✓
- 원문 "코드는 src/pricing/points.ts" ↔ 파일 경로 일치 ✓
- 원문에 없는 내용(등급 이름 regular/vip, discount>0 판정, 환불 회수 제외)도 모두 가정/설계 결정으로 구분 표기됨 ✓
