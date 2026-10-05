**포인트 적립 기능 완료** ✅

요청하신 포인트 적립 기능을 구현했습니다:

## 구현 내용

### 1. **도메인 규칙 정의** (domain.md)
- 기본 적립율: 결제 금액의 1% (내림)
- 쿠폰 적용: 0.5% (내림)
- VIP 회원: 1.5배 배수 적용
- 0원 결제: 포인트 0

### 2. **구현** (`src/pricing/points.ts`)
```typescript
function calculatePoints(total: number, hasDiscount: boolean, isVip: boolean): number
```
- 순수 함수로 구현
- 정수 포인트만 반환 (Math.floor로 내림)
- VIP와 쿠폰 조합 지원

### 3. **테스트** (`src/pricing/points.test.ts`)
- 총 13개 단위 테스트 추가
- 규칙 1~4를 각각 추적하는 테스트명
- 경계값 검증 (150원 = 1포인트 내림 등)
- 모든 조합 케이스 (VIP+쿠폰 0.75% 포함)

### 4. **게이트 통과**
- ✅ Typecheck 통과
- ✅ 123개 테스트 모두 통과
- ✅ 태스크 기록 (PRD·SDD·Trace) 완료
- ✅ Acceptance 체크박스 완성

모든 커밋은 `task/0030-points` 브랜치에 기록되었으며, 이슈 #1과 연결되어 있습니다.
