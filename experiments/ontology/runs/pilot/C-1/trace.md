# 0040-lab — 실험실 시료 보관 엔진 작업 기록

## 진행 상황

### Phase 1: 문서 작성 ✓
- [x] prd.md: 요구사항 정의
- [x] sdd.md: 설계 및 알고리즘 상세
- [x] trace.md: 작업 기록 (이 파일)

### Phase 2: 구현 (진행 중)
- [ ] src/lab/lab.ts: 핵심 구현
  - [ ] LabState 타입 및 createLab() 구현
  - [ ] 멱등성 검증 로직
  - [ ] receive() 구현
  - [ ] split() 구현
  - [ ] reserve() 구현
  - [ ] cancel() 구현
  - [ ] consume() 구현
  - [ ] discard() 구현
  - [ ] move() 구현
  - [ ] transferCustody() 구현
  - [ ] snapshot() 구현

### Phase 3: 테스트 및 검증
- [ ] pnpm check PASS
- [ ] 모든 규칙 커버

## 이슈 및 결정사항

### 결정 1: 이용 가능량 캐싱
- 매 호출마다 계산하는 것이 간단하고 정확함
- 캐싱 불필요 (메모리 기반이고 규모가 작음)

### 결정 2: 인자 비교
- JSON.stringify 후 정렬하여 비교 (키 순서 무시)
- 배열 순서는 그대로 유지하여 비교

## 작업 진행

| 날짜 | 한 일 | 상태 |
|------|------|------|
| 2026-10-15 | 문서(prd·sdd·trace) 작성, createLab 및 8개 함수 구현 | TypeScript type alias → immutability 문제 발견 |
| | spread operator를 사용하여 모든 state 수정 (reserve/consume/cancel/discard/move/split/transferCustody) | ✅ pnpm check PASS (타입, 테스트, 기록) |

## 핵심 구현
- eventIdMap으로 멱등성 구현 (같은 eventId + 같은 인자 → 첫 Receipt 반환)
- 이용 가능량 = remaining - reserved (매 호출 계산)
- 계보 관계 (parentId/rootId) 추적
- 이벤트 원자성: 실패하면 상태 변화 없음
- spread operator로 명시적 state mutation (Map 업데이트)
