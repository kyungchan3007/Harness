## ✅ 포인트 적립 기능 완성

요청하신 포인트 적립 기능을 완료했습니다.

### 구현 내용

**`src/pricing/points.ts`**
- `calculatePoints(total, {discount?, isVip?})` 함수 구현
- 기본 적립: 결제 금액의 1% (소수점 이하 버림)
- 할인 조정: 할인 금액의 1%를 포인트에서 차감
- VIP 보너스: 기본 적립량의 2배
- 포인트는 항상 0 이상의 정수 (음수 방지)

### 규칙 정의 (domain.md에 추가)
- 기본 적립율: `floor(total * 0.01)`
- 할인 조정: `basePoints - floor(discount * 0.01)`
- VIP 배수: ×2
- 최소값 보장: 0 이상

### 테스트 (8개 모두 통과)
- 도메인 규칙 1~4: 각 1개 이상
- 경계값 테스트: 99원/100원
- 복합 시나리오: 할인 + VIP

### 게이트 확인
```
✅ Typecheck
✅ Unit tests (117개 모두 통과)
✅ No npm/yarn lockfiles
✅ Task records (prd·sdd·trace·TASKS)
```

커밋:
- `feat: 포인트 적립 기능 추가 (0030)` — 구현 + 테스트
- `record: 0030 완료` — JOURNAL.md, TASKS.md 업데이트

모든 규칙을 준수하여 `pnpm check` ALL PASS 상태입니다.
