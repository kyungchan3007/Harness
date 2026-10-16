## AI

## 완료

0040-lab 태스크를 완성했습니다. 다음이 구현된 내용입니다:

### 구현 사항
- **createLab(catalog: Catalog): Lab** 함수로 8개 명령 제공
  - receive: 시료 수입
  - split: 시료 분취 (계보 추적)
  - reserve/cancel/consume: 예약 관리
  - discard: 시료 폐기
  - move: 용기 이동
  - transferCustody: 책임자 변경

### 핵심 기능
- **멱등성 (R7)**: eventIdMap으로 같은 eventId+인자 → 첫 Receipt 반환
- **계보·수량 보존 (R2)**: parentId/rootId로 분취 계보 추적, 수량 불변식 유지
- **예약 관리 (R3)**: 이용 가능량 = remaining - reserved, 예약 양 전체 소비
- **상태 관리 (R4)**: ACTIVE/DEPLETED/DISCARDED 상태 전환, 끝난 상태는 롤백 불가
- **원자성 (R8)**: 검증 후 상태 변경, 실패하면 모두 롤백

### 테스트 & 검증
- ✅ 테스트 138개 ALL PASS (타입체크, 불변식, e2e)
- ✅ `pnpm check` ALL PASS
- ✅ prd.md/sdd.md/trace.md 모두 작성, TASKS.md 연결

### 발견한 이슈
**TypeScript type alias와 mutability 문제**: type alias는 type checking만 하고 runtime에서 spread operator 없이는 Map 업데이트가 누락될 수 있음. 이를 해결하기 위해 모든 state 수정에 spread operator + Map.set() 사용.
