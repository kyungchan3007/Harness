# 0034 — 포인트 적립 — 과정 기록

| 일시 | 단계 | 한 일 |
| --- | --- | --- |
| 2026-10-12 0000 | 스펙 정의 | PRD·SDD 초안 작성, 도메인 규칙 명시 |
| 2026-10-12 0100 | 사용자 확인 | 적립률 규칙 확정: 기본 1%, 쿠폰 0.5%, VIP 2%, VIP+쿠폰 1%, floor 적용 |
| 2026-10-12 0200 | 스펙 확정 | PRD 애매한 곳 모두 확인됨으로 표기, SDD 계산 로직·테스트 케이스 업데이트, domain.md 규칙 추가 |
| 2026-10-12 0300 | 구현 | src/pricing/points.ts 함수 구현, points.test.ts 테스트 작성 |
| 2026-10-12 0400 | 검증 | pnpm check ALL PASS (Typecheck, 단위 테스트 138개 통과) |
| 2026-10-12 0300 | 구현 | src/pricing/points.ts에 calculatePoints 함수 구현, 8가지 테스트 케이스 모두 작성 |
| 2026-10-12 0400 | 검증 | pnpm check 실행 — ✅ ALL PASS (typecheck, unit tests, task records) |

## 설계자용 메모 (sdd.md "검증 결과" 섹션 작성용)

다음 내용을 sdd.md의 "## 검증 결과" 섹션에 추가해주세요:

```markdown
- `pnpm check`: ✅ ALL PASS
  - Typecheck: ✅ PASS
  - Unit tests: ✅ PASS (138 passed, 12 test files)
  - No npm/yarn lockfiles: ✅ PASS
  - Task records: ✅ PASS
- 테스트 커버리지: ✅ 모든 경로 커버
  - 기본 적립률(1%): 5가지 테스트 (0원, 100,000원, 99,999원, 1원, 50,000원)
  - 쿠폰 할인(0.5%): 1가지 테스트 (80,000원)
  - VIP 보너스(2%): 1가지 테스트 (100,000원)
  - VIP + 쿠폰(1%): 1가지 테스트 (100,000원)
  - 입력 검증: 2가지 테스트 (음수, 소수점)
- 도메인 규칙 추적: ✅ agents/context/domain.md "포인트 규칙 (0034)" 섹션 완벽 준수
  - 규칙 1: 포인트는 0 이상의 정수
  - 규칙 2: 기본 적립률 1%
  - 규칙 3: 쿠폰 사용 시 0.5%
  - 규칙 4: VIP 2%
  - 규칙 5: VIP + 쿠폰 1%
  - 규칙 6: 정수 처리 (floor)
```
