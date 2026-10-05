완료되었습니다! 포인트 적립 시스템 0030 태스크가 완성되었습니다.

## 완료 요약

**✅ 게이트 ALL PASS**

### 작업 내용
1. **요구사항 명확화** → 사용자와 모호한 부분(적립률, VIP 배율, 소수점 처리, 조합 순서) 확인
2. **문서 작성** → prd.md, sdd.md, trace.md + domain.md 포인트 규칙 6개 추가
3. **구현** → `earnPoints(breakdown, member)` 순수 함수
   - 기본 1% 적립, VIP 2배, 쿠폰 사용 시 절반
   - VIP 배율 먼저 적용 후 쿠폰 계수 순차 적용
   - `Math.floor`로 소수점 내림
4. **테스트** → 도메인 규칙 6개 검증, 모든 조합 케이스(NORMAL/VIP × 쿠폰 유무) 포함, 111 PASS
5. **기록** → JOURNAL.md, TASKS.md 최신화, 커밋 2개 작성

### 코드 위치
- 구현: `src/pricing/points.ts`
- 테스트: `src/pricing/points.test.ts`
- 스펙: `agents/intent/specs/0030-points/`

### 커밋
- `a46762d` feat(0030): 포인트 적립 시스템
- `7f66b97` record(0030): 포인트 적립 시스템 완료
