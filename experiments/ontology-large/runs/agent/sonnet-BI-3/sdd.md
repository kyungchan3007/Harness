# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md) · 원문: [request.md](request.md)

## 설계
- **읽은 문서:** `docs/{engine,quality,storage,reservations,transit}.md`, `agents/context/ontology.md`, `src/lab/*.ts`의 정책 주석(`storage.ts` 운송 점유, `samples.ts` 등급 상속)
- **접근:**
  1. 모든 명령은 기존 `Engine.run`(재전송 판정·작업 복사본·이력)을 그대로 거친다. 새 명령도 같은 길이라 E5·E6이 자동 적용된다.
  2. 운송 점유: `occupied`(용기→시료)에 출발 용기는 유지하고 목적 용기도 같은 시료로 추가한다. `Storage.isFree` 그대로 받기·분취·이동·다른 운송의 목적지가 막힌다. 도착이면 출발 항목 삭제, 취소면 목적 항목 삭제.
  3. 운송 중 판정은 `transits`에서 그 시료의 ACTIVE 운송을 찾는다(`state.ts`의 `inTransit`). 분취·소비·폐기·이동·추가 운송 시작에서 `IN_TRANSIT`.
  4. 보관 등급: `Storage.supports`(목록에 정확히 포함)를 받기·분취 자식 용기·이동·운송 목적지에 연결. 분취 자식 등급은 부모에서 상속.
  5. 만료: `advanceTime`이 `now`를 올리고 `expiresAt !== null && expiresAt <= now`인 ACTIVE 예약을 `EXPIRED`로, 시료 `reserved`에서 양을 뺀다. 이벤트 하나.
  6. 검사 순서: 입력 검증 → 존재·ID → 상태 → 격리/운송 → 용기·등급·용량 → 수량. 여러 규칙 위반 시 코드 선택은 자유(E6-4).
- **대안·트레이드오프:**
  - 목적 용기 확보를 별도 맵으로 두기: `isFree`와 모든 호출부를 고쳐야 하고 빠뜨리면 구멍이 생김 → `occupied` 재사용으로 한 곳에서 판정
  - 시료에 `inTransit` 플래그 추가: `SampleView` 공개 계약을 못 바꿈 → `transits` 조회
  - 만료를 조회 시점에 계산: 상태·이력이 시각과 어긋남 → `advanceTime`에서 확정
- **파일 계획:** `src/lab/{state,samples,reservations,quality,transit}.ts` 수정, `src/lab/lab.test.ts` 신규. `types.ts`·`docs/` 수정 없음.
- **위험:** 운송 중 시료 종료(`finish`)가 목적 확보를 남기는 경우 → 운송 중 폐기·소비·분취를 모두 막아 도달 불가. 확인: 테스트.
- **검증 계획:** 명령별 성공·실패 코드, 실패 뒤 스냅숏 불변, 재전송(성공 재전송·EVENT_CONFLICT·실패 eventId 재사용), 이력 args 모양, 불변식(수량 보존·점유) 테스트 + `pnpm check`.

## 계획과 달라진 점
- 계획대로. `activeTransit` 헬퍼를 `state.ts`에 추가, `storage.ts`는 주석만 정리(로직 변경 없음).

## 검증 결과
- `pnpm check` ALL PASS. `src/lab/lab.test.ts`(격리·등급·만료·운송·재전송/이력)로 실패 뒤 스냅숏 불변과 코드별 거절을 확인.
