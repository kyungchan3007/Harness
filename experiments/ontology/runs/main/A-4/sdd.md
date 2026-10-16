# 0040 — 연구실 시료 보관 엔진 — SDD

요구사항: [prd.md](prd.md)

## 설계

### 읽은 문서
- AGENTS.md, harness/loop.md, context/architecture.md
- src/lab/types.ts (공개 계약)

- **접근:** 8개 메서드(receive, split, reserve, cancel, consume, discard, move, transferCustody) 구현, R1-R8 규칙 준수

## 접근

### 상태 관리 구조
- `samples: Map<sampleId, SampleInternal>` — 시료 내부 상태 (SampleView + 내부 필드)
- `reservations: Map<reservationId, ReservationInternal>` — 예약 상태
- `containerToSample: Map<containerId, sampleId>` — 용기 → 시료 매핑 (R1, R5)
- `usedIds: Set<sampleId | reservationId>` — 사용한 ID 추적 (R7)
- `eventLog: Map<eventId, { input, receipt }>` — eventId 멱등성 (R7)
- `allEvents: EventView[]` — 공개 이벤트 로그

### 각 메서드 구현 전략
- **receive:** 루트 시료 생성, 용기 확인, 이용 가능량=남은 양
- **split:** 자식 양의 합 ≤ 부모의 이용 가능량, 원자성(모두 성공 또는 모두 실패)
- **reserve:** 이용 가능량 확인, reserved += qty
- **cancel:** 예약 상태 CANCELED, reserved -= qty
- **consume:** 남은 양과 reserved 동시 감소, consumedQty 증가, 상태 업데이트
- **discard:** remaining → 0, discardedQty 증가, 상태 DISCARDED
- **move:** 목표 용기 확인, 새 용기 배정, 이전 용기 비우기
- **transferCustody:** 책임자만 변경

### 검증 순서
- 1단계: eventId 중복 체크 (R7-1, R7-2)
- 2단계: 입력 검증 (R1-5)
- 3단계: 상태 검증 (R2, R3, R4, R5, R6)
- 4단계: 원자성 보장 (R8-2)
- 5단계: 이벤트 기록 (R8-1)

### 핵심 불변식
- 이용 가능량 = remaining - reserved ≥ 0
- 계보 수량: 루트의 받은 양 = Σ(남은 양) + Σ(소비) + Σ(폐기)
- 끝난 시료는 용기를 비운다 (R4-5)
- ACTIVE 예약 ⊂ ACTIVE 시료

### 파일 계획
- `src/lab/lab.ts` — `createLab(catalog)` 함수와 내부 상태 클래스
- `src/lab/__tests__/lab.test.ts` — 규칙별 단위 테스트
- 기존 `src/lab/types.ts` — 그대로 유지

### 위험 및 방지
- **수량 오버플로:** 합산이 Number.MAX_SAFE_INTEGER를 초과할 수 있다. → qty 최대값 1,000,000 × 시료 개수가 제한적이므로, 현실적으로 안전.
- **깊은 복사 성능:** 매번 복사는 비싸다. → 메모리 엔진(이 태스크)이므로 성능보다 정확성 우선.
- **eventId 비교:** 객체 키 순서 무시, 배열 순서 구별. → JSON.stringify 대신 직접 비교 로직 구현.

- **대안·트레이드오프:** eventId 멱등성·원자성 구현, 상태 불변식 검증

## 대안·트레이드오프

- **이벤트 기록을 args 복사로 구현:** R8-3에서 "호출한 쪽이 넘긴 객체를 나중에 고쳐도" 영향 없어야 한다. 깊은 복사를 선택 (structuredClone 또는 JSON.parse/stringify 대체 사용).
- **검사 순서:** eventId를 맨 처음 검사하면 실패한 명령의 eventId도 기록할 수 있다 (R7-4). R7-1을 먼저 적용해야 한다.
- **상태 변경 원자성:** split에서 여러 자식을 만들 때 첫 자식은 성공했지만 둘째가 실패하면, 첫 자식도 다시 없애야 한다. 메모리 주소를 직접 조작하지 않고, 성공 후에만 상태에 반영한다.

- **검증 계획:** 규칙별·상호작용·경계값·멱등성 테스트, pnpm check ALL PASS

## 검증 계획

1. 규칙별 테스트: R1-R8 각각 최소 1개 이상
2. 상호작용 테스트: 여러 규칙이 함께 작동하는 시나리오 (공개 예시 5개 포함)
3. 경계값: qty=1, qty=1,000,000, remaining=0, reserved=remaining
4. eventId 멱등성: 성공/실패 케이스
5. `pnpm check` ALL PASS

### 실험 및 학습

- eventId 검사를 먼저 하면, 사실상 실패한 명령의 eventId도 "기록"되는 것인가? → 규칙 R7-4를 명확히 한다.

---
*마지막 업데이트: 2026-10-16 20:55 KST*
