# 0030 — 포인트 적립 기능 — SDD

- **접근:** 회원 등급(VIP/NORMAL)과 쿠폰 사용 여부를 기준으로 적립률을 결정하고, 결제 금액에 비율을 곱한 후 반올림하여 포인트를 계산합니다. NORMAL 회원이 쿠폰 사용 시 0포인트, 기본 1% 적립, VIP 회원은 3% 적립(쿠폰 사용 무관)

## 아키텍처

### 모듈 위치
- `src/pricing/points.ts` - 포인트 계산 로직

### 인터페이스

```typescript
interface Member {
  grade: "VIP" | "NORMAL";
}

function calculatePoints(priceBreakdown: PriceBreakdown, member: Member): Won
```

## 알고리즘

### 1단계: 쿠폰 사용 여부 확인 (NORMAL 회원만)
```
if (member.grade === "NORMAL" && priceBreakdown.discount > 0) {
  return 0 (포인트 적립 안 함)
}
```

### 2단계: 적립률 결정
```
rate = member.grade === "VIP" ? 0.03 : 0.01
```

### 3단계: 포인트 계산 및 반올림
```
points = Math.round(priceBreakdown.total * rate)
return points
```

## 타입 정의

### PriceBreakdown (기존)
```typescript
interface PriceBreakdown {
  subtotal: Won;
  discount: Won;
  shipping: Won;
  total: Won;
}
```

### Member (신규)
```typescript
interface Member {
  grade: "VIP" | "NORMAL";
}
```

## 검증

### 입력 검증
- `priceBreakdown` 및 모든 필드는 Won (정수, 0 이상)
- `member.grade`는 "VIP" 또는 "NORMAL"

### 출력
- 반환값은 항상 0 이상의 정수 (Won)

## 테스트 케이스

### NORMAL 회원, 쿠폰 없음
- 입력: total=100,000, discount=0, grade="NORMAL"
- 예상: 1,000

### NORMAL 회원, 쿠폰 사용
- 입력: total=90,000, discount=10,000, grade="NORMAL"
- 예상: 0

### VIP 회원, 쿠폰 없음
- 입력: total=100,000, discount=0, grade="VIP"
- 예상: 3,000

### VIP 회원, 쿠폰 사용
- 입력: total=90,000, discount=10,000, grade="VIP"
- 예상: 2,700 (90,000 × 3%)

### 반올림 케이스
- 입력: total=1,350, discount=0, grade="NORMAL"
- 예상: 14 (13.5 → 올림)

### 반올림 케이스 (내림)
- 입력: total=1,335, discount=0, grade="NORMAL"
- 예상: 13 (13.35 → 내림)

- **대안·트레이드오프:** (1) 적립률 저장: 상수 하드코딩 0.01/0.03 vs config 테이블 → 현재는 규칙이 단순하고 등급이 두 가지뿐이므로 하드코딩 선택, (2) 쿠폰 판단: discount > 0 vs 별도 객체 → domain.md에서 쿠폰이 discount를 만들므로 discount 필드 활용, (3) 반올림: Math.round() vs Math.floor/ceil → 요구사항 "0.5 이상 올림"과 일치

- **검증 계획:** 단위 테스트로 NORMAL 기본(1%), NORMAL 쿠폰(0), VIP 기본(3%), VIP 쿠폰(3%), 반올림 케이스 검증; 입력 검증으로 유효하지 않은 등급과 음수 포인트 거부; priceCart 결과와 통합 동작 및 pnpm check 통과 확인
