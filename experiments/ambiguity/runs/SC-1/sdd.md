# 0034 — 포인트 적립 — SDD

- **접근:** 포인트 적립 계산은 순수 함수로 구현한다. VIP는 기본 적립률의 2배를 받고, 쿠폰 사용 시 적립률에 0.5를 곱해 절반으로 줄인다. 부작용이 없으므로 단위 테스트로 완전히 검증할 수 있다.

## 계산 로직

### 입력

```typescript
interface PointsInput {
  total: number;           // 결제 금액 (원, 정수)
  memberGrade: "normal" | "vip";
  usedCoupon: boolean;     // 쿠폰 사용 여부
}
```

### 적립률 결정 규칙

| 상황 | 적립률 |
| --- | --- |
| 일반 회원 (normal) | 1% |
| VIP 회원 (vip) | 2% (기본의 2배) |
| 쿠폰 사용 | × 0.5 (적립률의 절반) |

#### 조합

- 일반 + 쿠폰 미사용: 1%
- 일반 + 쿠폰 사용: 1% × 0.5 = 0.5%
- VIP + 쿠폰 미사용: 2%
- VIP + 쿠폰 사용: 2% × 0.5 = 1.0%

### 계산 알고리즘

```
1. 기본 적립률을 멤버 등급으로 결정한다.
   - normal: 1%
   - vip: 2% (기본의 2배)
2. 쿠폰 사용 시 적립률에 0.5를 곱한다 (적립률 × 0.5).
3. 적립률이 음수가 되지 않도록 최소 0을 보장한다.
4. total × 적립률 / 100 을 계산한다.
5. 정수로 내림(Math.floor)한다.
```

### 함수 시그니처

```typescript
export function calculatePoints(
  total: number,
  memberGrade: "normal" | "vip",
  usedCoupon: boolean
): number
```

## 제약

1. `total`은 domain.md 규칙상 0 이상의 정수여야 한다.
2. 반환값은 0 이상의 정수다.
3. 부작용 없음 (순수 함수).
4. 동기 계산 (promise 없음).

- **대안·트레이드오프:**
  - **대안 1: VIP 적립률** — 1.5배: 1.5%, 2배: 2% ✓ | 선택: 2배가 더 직관적이고 강한 인센티브 제공
  - **대안 2: 쿠폰 조합** — 뺄셈: 1% − 0.5%, 곱하기: 1% × 0.5 ✓ | 선택: 곱하기가 더 직관적 ("절반을 줄임" = 0.5배)
  - **대안 3: 버림 방식** — 내림(floor) ✓ | 선택: 포인트는 고객에게 불리한 쪽(내림)으로 처리

- **검증 계획:**
  1. **단위 테스트 (src/pricing/points.test.ts)**
     - 기본 케이스: normal/vip, coupon 조합 4가지
     - 경계값: total=0, total=1, 소수점 버림 확인
     - 큰 금액: 1,000,000원 이상 테스트
  2. **정적 분석**
     - TypeScript 타입 체크
     - ESLint 규칙 확인
  3. **게이트**
     - `pnpm check` (test + lint + type) 통과

## 테스트 케이스

### 일반 케이스

- [ ] total=100,000, normal, no coupon → 1,000포인트 (1%)
- [ ] total=100,000, vip, no coupon → 2,000포인트 (2%)
- [ ] total=100,000, normal, coupon → 500포인트 (1% × 0.5)
- [ ] total=100,000, vip, coupon → 1,000포인트 (2% × 0.5)

### 경계값

- [ ] total=0 → 0포인트
- [ ] total=1, normal, no coupon → 0포인트 (1% of 1 = 0.01 → floor = 0)
- [ ] total=100, vip, no coupon → 2포인트 (2% of 100 = 2 → floor = 2)

### 예외값 (버림 동작 확인)

- [ ] total=99, normal, coupon → 0포인트 (0.5% of 99 = 0.495 → floor = 0)
- [ ] total=1,000, vip, coupon → 10포인트 (1.0% of 1,000 = 10 → floor = 10)

## 파일 구조

```
src/pricing/
├── points.ts          # calculatePoints 함수 구현
└── points.test.ts     # 테스트
```

## 의존성

- 외부 라이브러리 불필요 (기본 JavaScript 연산)
- domain.md의 금액 정수 규칙을 준수
