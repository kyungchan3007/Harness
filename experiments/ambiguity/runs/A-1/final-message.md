완료되었습니다! 포인트 적립 기능을 성공적으로 구현했습니다.

## 요약

**구현 사항:**
- `src/pricing/points.ts`: `calculatePoints` 함수 구현
  - 기본 적립률 1% (`total × 0.01`)
  - 쿠폰 사용 시 0.5% 감소 (`discount > 0`)
  - VIP 회원 1.5배 배율 적용
  - `Math.floor`로 정수 계산

**문서 완성:**
- `agents/intent/specs/0030-points/prd.md`: 요구사항 정의
- `agents/intent/specs/0030-points/sdd.md`: 설계 결정 및 대안 분석
- `agents/intent/specs/0030-points/trace.md`: 작업 과정 기록

**테스트:** 116개 테스트 전부 통과
- 기본 적립, 쿠폰 사용, VIP, VIP+쿠폰 조합
- 엣지 케이스 (내림 계산, 큰 금액)

**게이트:** `pnpm check` ✅ ALL PASS
