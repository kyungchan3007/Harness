# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md) · 도메인: [../../context/ontology.md](../../context/ontology.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.md, types.ts
- **접근:**
  - `src/lab/lab.ts`: `Lab` 인터페이스 구현체
    - 내부 상태: samples, reservations, containers (Map 기반), custodianIds (Set), idRegistry (Set), eventLog, eventCache
    - 명령 흐름: (1) idempotency check (R7) → (2) 전제 검증 (R1~R6) → (3) 상태 변경 (원자) → (4) 이벤트 기록
    - 검증 실패는 `{ ok: false, code }` 반환 (예외 없음)
  - 원자성: split은 모든 자식 검증 먼저, 그 다음 모두 생성. DB 트랜잭션 없이 상태 변경 전 검증으로 보장
  - 이벤트 기록: args는 호출 시점의 값 그대로 저장 (R8-3). 객체/배열 복사 필요
- **대안·트레이드오프:**
  - **Catalog 검증:** 초기화 시만 등록하고, 매 명령마다 재검증하지 않음 → 채택. Catalog는 불변 가정
  - **ID 중복 검사:** sampleId/reservationId/containerId/custodianId를 같은 Set(idRegistry)으로 관리 → 채택. R1-4 "종류마다 따로 고유"는 같은 Set으로도 구현 가능
  - **args 비교:** JSON.stringify + Object.keys().sort()로 객체 키 순서 무시, 배열 순서 구별 (R7-3) → 채택
  - **available 계산:** remaining − reserved로 매번 계산, 따로 저장 안 함 → 채택. 실시간 성능 필요 없음
- **파일 계획:**
  - `src/lab/lab.ts`: Lab 구현 (약 450줄)
  - `src/lab/lab.test.ts`: 규칙별 단위 테스트 40개 이상
  - `agents/intent/specs/0040-lab/prd.md`, `sdd.md`, `trace.md`
- **위험:**
  - R1-5 qty 경계값 (1~1,000,000): Number.isInteger + 범위 검사로 명확히
  - I1 계보 수량 보존: split/consume/discard마다 계산 검증
  - R7 args 재전송: 정규화 필수 (객체 키 정렬)
- **검증 계획:**
  - 단위 테스트: 규칙 R1~R8, 불변식 I1/I3/I4/I7 (이름에 규칙 번호)
  - 공개 예시 5개 통합 테스트 (요청 문서)
  - 경계값: qty 1/1000000, reserved = remaining, 분취 모두-실패
  - `pnpm check`: TypeCheck, 테스트, lockfile, spec Acceptance
