# 0033 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, harness/loop.md, domain.md, 0002의 priceCart 구조
- **접근:**
  - `src/pricing/points.ts`: `calculatePoints(total, discount, memberType)` 순수 함수. 쿠폰·회원 타입을 인자로 받는다.
  - 적립률 계산: 기본 1%, 쿠폰 적용 시 0.5%, VIP 회원 2배.
  - 정수 변환: `Math.floor()`로 소수점 제거.
  - memberType 기본값: 'NORMAL'
- **대안·트레이드오프:**
  - 회원 타입을 enum vs 문자열: 초기엔 문자열로 진행하고, 필요시 upgrade.
  - 적립률을 상수로 따로 정의: 매직 넘버(1%, 0.5%)를 보기 쉽게. 도메인 변경에 대응.
  - VIP 2배 계산을 "VIP이면 x2 곱하기" vs "VIP이면 다른 규칙 적용": 전자가 더 간단하고 domain.md와 일치.
- **파일 계획:** `src/pricing/points.ts`(+test), `agents/context/domain.md` 포인트 규칙 추가, architecture.md·README 갱신
- **위험:** discount가 total을 초과하는 경우 → domain.md의 배송비 규칙에서 이미 방지됨. 입력값으로 받으므로 여기선 가정할 수 있다.
- **검증 계획:** 적립률별 단위 테스트, VIP/쿠폰 조합 테스트, 경계값 테스트, `pnpm check`

## 검증 결과
- `pnpm check`: ALL PASS (Typecheck, 18개 테스트, Task records)
- 포인트 규칙 1~5: 테스트명에 규칙 번호를 붙여 domain.md와 1:1 추적
- 적립률별 조합: 기본 1%, 쿠폰 0.5%, VIP 2배, VIP+쿠폰 1% 모두 테스트
- 경계값: total=0 / total=1 / 소수점 floor 처리 검증
- 공백: 애초 requirements의 "쿠폰을 쓴 주문은 적립을 좀 줄여 주세요"를 0.5%로 구체화하는 과정에서 사용자 입력이 필요했는데, (확인됨)으로 마킹했으므로 범위 명확
