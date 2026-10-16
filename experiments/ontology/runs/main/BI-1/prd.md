# 0040 — 시료 보관 엔진 — PRD

- **이슈:** #1

## 요약
가상의 연구실에서 시료(액체)의 생명주기를 기록하는 인메모리 엔진. 수용·분취·예약·소비·폐기·이동·책임자 변경을 원자적으로 처리하고, 계보와 수량 보존을 추적한다.

## Acceptance
- [ ] 모든 8개 명령 구현 및 작동 확인
- [ ] 11개 불변식(I1~I11) 검증
- [ ] `pnpm check` 통과 (타입·테스트)
- [ ] 공개 예시 5개 시나리오 수동 검증

## 완료 조건
1. `src/lab/lab.ts`에 `createLab(catalog: Catalog): Lab` 구현 및 내보내기
2. `src/lab/types.ts`는 수정하지 않음 (이미 정의된 계약 사용)
3. 모든 8개 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody) 구현
4. 11개 불변식(I1~I11) 충족
5. R1~R8 규칙 전체 준수
6. `pnpm check` PASS (타입·테스트)

## 핵심 제약
- 메모리 내 한 번에 한 호출씩 처리 (저장소·동시·실제 시각 제외)
- 실패는 예외 아닌 `{ ok: false, code }` 반환
- 이벤트 중복 재전송 지원(R7)
- 모든 명령 원자성(R8)
- 첫 seq는 1, 1씩 증가(I7)

## 규칙 요약

### 참조(R1)
- 장소·용기·책임자는 Catalog에서만 참조
- 없으면 UNKNOWN_* 반환
- ID는 종류마다 고유 (샘플 ID ≠ 용기 ID 같은 글자 가능)
- 양은 1~1,000,000, 아니면 INVALID_INPUT

### 계보·수량(R2)
- receive만 root 시료 생성
- split은 자식 1개 이상, 부모의 available 이하만 분취 가능
- 불변식 I1: rootId의 모든 시료 remaining+consumedQty+discardedQty = 받은 양

### 예약·소비(R3)
- available = remaining − ACTIVE 예약 합
- reserve: available 이하만 가능, remaining 그대로 유지
- consume: 예약 양 전체만 사용 가능, remaining·reserved·consumedQty 변경
- cancel: reserved 감소

### 상태·폐기(R4)
- ACTIVE → DEPLETED(분취·소비로 남은 양 0) 또는 DISCARDED(discard로 폐기)
- DEPLETED·DISCARDED는 최종 상태 (되살릴 수 없음)
- discard는 ACTIVE 예약이 없어야 함

### 용기(R5)
- move: 시작 시점에 비어 있는 용기로만 이동 가능
- split의 자식들도 시작 시점에 비어 있어야 함
- 이동은 양·예약·계보·책임자 불변

### 책임(R6)
- receive 때 책임자 할당
- split 자식은 부모의 책임자 이어받음
- transferCustody는 그 시료만 변경

### 이벤트 중복(R7)
- 성공한 eventId+같은 명령+같은 인자 → 처음 Receipt 반환, 상태 무변화
- 다른 명령·인자 → EVENT_CONFLICT
- 실패한 eventId는 재시도 가능

### 원자성(R8)
- 성공 시만 이벤트 기록, seq 증가
- 실패 시 모든 상태 무변화 (split도 전부 또는 전무)
- 이력의 args는 명령 인자 전체 복사본 (이벤트 ID 제외)

## 애매한 곳·가정
- 없음 — 요청이 규칙(R1~R8)과 온톨로지로 충분히 명확함
