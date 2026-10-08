# SDD — 포인트 적립 설계 (0030)

> 결제 금액 기반 포인트 적립 로직. 회원 등급과 쿠폰 사용 여부에 따라 적립률 결정.

## 기술 사양

### 함수 시그니처

```typescript
interface PriceBreakdown {
  subtotal: number;    // 상품 합계 (원)
  discount: number;    // 할인액 (원)
  shipping: number;    // 배송비 (원)
  total: number;       // 결제 금액 (원)
}

interface MemberInfo {
  grade: "VIP" | "NORMAL";
}

function calculatePoints(
  priceBreakdown: PriceBreakdown,
  memberInfo: MemberInfo
): number {
  // 포인트 반환 (정수)
}
```

### 계산 알고리즘

1. **쿠폰 사용 여부 판단**: `discount > 0`
2. **VIP 여부 판단**: `memberInfo.grade === "VIP"`
3. **기본 포인트 계산**:
   - VIP가 아니고 쿠폰 사용: 0포인트
   - VIP 또는 일반+쿠폰X: `total × 기본률 / 100`
   - 기본률: 일반 1%, VIP 3%
4. **반올림**: Math.round() 사용 (0.5 이상 올림)

### 구현 위치
- 파일: `src/pricing/points.ts`
- 내보낼 함수: `calculatePoints`
- 타입 정의: `PriceBreakdown`, `MemberInfo` (도메인 타입과 통합 고려)

### 의존성
- 외부 라이브러리: 없음 (순수 계산)
- 도메인 모듈: domain.md의 규칙 참조

### 테스트 케이스 (pnpm check에서 자동 검증)
- 일반 회원, 쿠폰 없음: 1% 계산
- 일반 회원, 쿠폰 있음: 0포인트
- VIP 회원, 쿠폰 없음: 3% 계산
- VIP 회원, 쿠폰 있음: 3% 계산 (쿠폰 무시)
- 반올림 검증: 0.5 이상 올림, 미만 내림

- **접근:** 순수 계산 함수로 구현. 외부 의존성 없음. 도메인 모듈(money.ts, price-cart.ts)의 기존 타입 재사용.

- **대안·트레이드오프:**
  - 순수 함수 — 단순, 테스트 용이, 외부 상태 무관
  - Math.round — domain 반올림 규칙 준수

- **검증 계획:**
  - 단위 테스트: 케이스별(일반/VIP, 쿠폰O/X) 포인트 계산 정확성
  - 엣지 케이스: 0원, 1원, 0.5포인트 경계 검증
  - pnpm check: 전체 빌드·타입·테스트 통과 확인
