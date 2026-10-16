# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계

- **읽은 문서:** 요청 본문(R1~R8, 공개 예시 5개)
- **접근:**
  1. **상태 머신 기반:** Sample(ACTIVE → DEPLETED|DISCARDED), Reservation(ACTIVE → CANCELED|CONSUMED)
  2. **트랜잭션:** 모든 검증을 먼저 수행, 실패 시 상태 변경 없음. split은 여러 자식을 원자적으로 생성
  3. **멱등성:** eventId별로 성공한 명령을 캐시, 동일 eventId 재전송 시 상태 변경 없고 처음 Receipt 반환
  4. **컨테이너 인덱스:** 용기별로 현재 ACTIVE 시료 추적, O(1) 점유 상태 검사
  5. **불변식 자동 보존:** 각 명령이 I1~I11을 자동으로 만족하도록 설계
- **대안·트레이드오프:**
  - eventId 캐시 메모리 vs 디스크 저장: 인메모리이므로 메모리 캐시만 (실제 저장소 없음)
  - 검증 모두 먼저 vs 검증 순차: 검증을 모두 먼저 → 원자성 보장, split 롤백 불필요
  - 예외 vs Result 타입: Result 타입 선택 → 명령 실패를 정상 처리로 다룸, 호출자가 쉽게 구분
  - args 비교 JSON.stringify vs 커스텀: JSON.stringify 사용 → 객체 키 순서 무시, 배열 순서 구분 (R7 만족)
  - available 캐싱 vs 계산: 매번 계산 → remaining - reserved (저장하지 않음, R3-1)
- **파일 계획:** `src/lab/lab.ts` (createLab 함수), `src/lab/types.ts` (이미 있음, 수정 안 함)
- **검증 계획:**
  - 단위 테스트: R1~R8 각 규칙 검증 (qty 범위, ID 중복, 상태 오류, 용량 초과 등)
  - 불변식: I1(계보 수량), I2(용기 배정), I4(reserved 정합), I10(ID 고유성) 검증
  - 시나리오: 공개 예시 5개 + 멱등성(동일 eventId) + EVENT_CONFLICT(다른 인자) + split 롤백
  - 게이트: `pnpm check` (타입 체크, 테스트, lint)
