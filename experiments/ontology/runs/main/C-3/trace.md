# TRACE — 0040 연구실 시료 보관 엔진

## 작업 내력

| 단계 | 한 일 | 판단·이유 | 막힘·되돌림 |
| --- | --- | --- | --- |
| 1 | PRD·SDD·trace.md 작성, TASKS.md 등록 | 규칙 PR1~R8 정의, 내부 구조 설계 완료 | |
| 2 | lab.ts 구현 (8가지 명령, 멱등성, 원자성) | R1~R8 모두 준수, handleIdempotency로 R7·R8 통합 | 인자 deep copy 필요 |
| 3 | 수정: 임포트 확장자 추가, idempotency 로직 통합 | eventLog 기록을 handleIdempotency 내부로 이동, args deep copy 추가 | |

### [2026-10-16] Phase 1: 문서 작성 (PRD·SDD)
- [x] PRD 작성 — 요구사항 정의, 8가지 규칙, 오류 코드, 성공 기준
- [x] SDD 작성 — 내부 구조, 알고리즘, 불변식, 테스트 케이스
- [x] trace.md 생성

### Phase 2: 구현 (lab.ts)
- [ ] createLab 함수 스켈레톤
- [ ] 내부 상태 초기화
- [ ] receive 명령 구현
- [ ] split 명령 구현
- [ ] reserve 명령 구현
- [ ] cancel 명령 구현
- [ ] consume 명령 구현
- [ ] discard 명령 구현
- [ ] move 명령 구현
- [ ] transferCustody 명령 구현
- [ ] snapshot 구현
- [ ] R7 위임 재전송 (idempotency) 검사 통합

### Phase 3: 검증
- [ ] 예시 5가지 테스트 (수동 또는 단위 테스트)
- [ ] `pnpm check` 통과
- [ ] 모든 오류 코드 커버리지 확인

### Phase 4: 기록
- [ ] TASKS.md 업데이트
- [ ] JOURNAL.md 기록
- [ ] 커밋 [허점], [보완], [컨텍스트·토큰] 작성

---

## 핵심 결정사항

### R7 위임 재전송의 인자 비교
- 객체 키 순서는 무시 (깊은 비교)
- 배열 순서는 구별 (요소 단위 비교)
- `JSON.stringify` 정렬은 사용하지 않고 구조적 비교 사용

### 실패 시 상태 보호
- 모든 검사를 미리 수행 (상태 변경 전)
- split은 자식들 생성을 모두 성공하거나 모두 실패
- 실패한 eventId는 기록되지 않아 재시도 가능

### 용기 점유(occupancy) 추적
- containers에 occupantSampleId 저장
- move/split 시 용기 공한지 미리 확인
- 시료가 DEPLETED/DISCARDED 되면 용기 비움

---

## 주의사항

1. **수량 보존 검사** — split 후 부모·자식의 수량 합이 불변인지 항상 확인
2. **예약 상태** — CANCELED·CONSUMED 예약에 cancel/consume 재호출 시 RESERVATION_CLOSED
3. **시료 활성 검사** — DEPLETED·DISCARDED 시료는 분취·예약·폐기·이동·책임자 변경 불가
4. **용기 일관성** — ACTIVE 시료는 항상 containerId 지정, DEPLETED·DISCARDED는 null
5. **책임자 변경** — transferCustody는 한 시료만 변경, 부모/자식 영향 없음
