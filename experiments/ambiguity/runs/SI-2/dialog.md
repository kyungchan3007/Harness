## AI

완료되었습니다! 포인트 적립 기능을 모두 구현하고 검증했습니다.

**✅ 완료 사항:**

1. **spec 문서 작성** (agents/intent/specs/0033-points/)
   - prd.md: 요구사항 & 애매한 곳 명확화 (memberType 기본값, 소수 처리, 쿠폰 판정 확인됨)
   - sdd.md: 함수 설계 & 검증 결과
   - trace.md: 작업 과정 기록

2. **domain.md 업데이트**
   - 포인트 적립 규칙 1~5 추가
   - 기본 1%, 쿠폰 0.5%, VIP 2배, Math.floor() 정의

3. **구현** (src/pricing/points.ts)
   - `calculatePoints(total, discount, memberType)` 함수
   - 결제 금액의 1% 기본 적립
   - 쿠폰 사용 시 0.5%로 감소
   - VIP 회원은 적립률 2배
   - 포인트는 정수 (floor 적용)

4. **테스트** (src/pricing/points.test.ts)
   - 18개 테스트: 규칙별 3개 이상 + 경계값 + 조합 검증
   - pnpm check: ✅ ALL PASS

5. **기록**
   - TASKS.md: 0033 done 마킹
   - JOURNAL.md: 완료 기록 추가
   - 커밋: [허점] [보완] [컨텍스트·토큰] 섹션 포함

**드러난 공백:**
쿠폰 적립률을 사용자가 "좀 줄여 주세요"로 모호하게 표현해서, spec 단계에서 "(확인 필요)" → "(확인됨: 0.5%)"로 명확히 하는 과정이 필요했습니다.
