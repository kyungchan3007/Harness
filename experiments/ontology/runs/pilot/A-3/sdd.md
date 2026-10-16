# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, CLAUDE.md, src/lab/types.ts, 요청 메시지의 R1~R8 규칙
- **접근:**
  - `src/lab/lab.ts`: `createLab(catalog) → Lab` 팩토리. 8개 메서드로 R1~R8 규칙 구현.
  - **데이터 구조:** `samples`, `reservations`, `containers`, `eventLog` Map<ID, Record>로 관리. Set으로 O(1) 존재 확인.
  - **멱등성:** eventLog에서 eventId 확인 후, 같은 인자면 이전 Receipt 반환, 다른 인자면 EVENT_CONFLICT.
  - **원자성:** 모든 검증을 먼저 완료 후, 검증 통과 시 상태를 한 번에 변경. split 실패 시 모든 자식이 없어야 함.
  - **계보:** parentId, rootId로 추적. split 자식들은 부모의 rootId와 custodianId 상속.
  - **용기 상태:** 시료마다 containerId 유지, 끝난 시료(DEPLETED/DISCARDED)는 containerId=null로 용기 해제.
- **대안·트레이드오프:**
  - Map vs Object: ID가 숫자일 수 있으므로 Map. → Map 채택.
  - 사본으로 롤백 vs 순차 검증: 검증 단계에서 모든 오류 확인 후 변경이 간단. → 순차 검증.
  - JSON.stringify vs 깊은 비교: 키 순서 정규화 필요하므로 deepEqual 함수 작성. → 깊은 비교 함수.
  - 계보 캐시: split 후 변경 안 되므로 parentId 필드만 추적. → 필드 추적.
- **파일 계획:** `src/lab/lab.ts` (구현체), `src/lab/lab.test.ts` (R1~R8 테스트, 각 규칙당 1개 이상)
- **위험:**
  - split 원자성: 일부 자식만 생성되면 안 됨 → 사전 검증 후 전체 생성.
  - containerId 관리: DEPLETED/DISCARDED 시 용기의 occupantSampleId도 함께 null로 설정.
  - 멱등성: 인자 비교에서 객체 키 순서 무시하되 배열 순서는 구별 → deepEqual 구현.
- **검증 계획:**
  - 규칙별 테스트: R1 (UNKNOWN_*), R2 (계보·다단계 split), R3 (INSUFFICIENT·reserved), R4 (NOT_ACTIVE), R5 (용기·용량), R6 (custodian 상속), R7 (멱등성·EVENT_CONFLICT), R8 (원자성·seq)
  - split 중 자식 용기 점유 중 → 모든 자식 미생성 확인
  - receive 100 → split(30,70) → discard → split 후 수량 검증
  - qty 경계값: 1, 1,000,000
  - `pnpm check` ALL PASS

## 검증 결과 (빌드 후 작성)

## 공백·학습 (완료 후 작성)
