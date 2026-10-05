완료되었습니다! 🎉

## 작업 요약

**0030 포인트 적립** 기능을 완성했습니다.

### 구현 내용
- **파일:** `src/pricing/points.ts` + `src/pricing/points.test.ts`
- **함수:** `calculatePoints(breakdown: PriceBreakdown, member: Member): number`
- **기능:**
  - 기본 적립률: 결제 금액의 1%
  - 쿠폰 사용 시: 적립률 50% 감소 (0.5%)
  - VIP 회원: 적립률 2배 (2%)
  - VIP + 쿠폰: 적립률 1% (VIP 2배 → 쿠폰 절반)
  - 포인트는 `Math.floor`로 내림하여 정수 처리

### 검증
- 단위 테스트: 8가지 시나리오 전수 커버 (113개 테스트 ALL PASS)
- 타입 검증: TypeScript strict mode PASS
- 게이트: `pnpm check` ALL PASS

### 커밋 (3개)
1. `ed294b7` feat(0030): 포인트 적립 기능 구현
2. `a93c1a6` chore(0030): TASKS·JOURNAL 갱신
3. `5c5add4` docs(0030): Acceptance 체크박스 완료 표시
