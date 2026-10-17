# 0040 — 시료 보관 엔진 확장(격리·보관 등급·예약 만료·운송) — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시료 보관 엔진에 격리·보관 등급·예약 만료·운송이 연결돼 있지 않다(`quarantine`·`release`·`advanceTime`·운송 3종은 throw, 보관 등급은 임시값).
- **목표:** `types.ts`의 공개 계약과 `docs/`의 정책 문서 5개(engine·quality·storage·reservations·transit)대로 새 기능을 구현하고, 기존 재전송(E5)·원자성·이력(E6) 규칙을 새 명령에도 적용한다.
- **비목표:** `types.ts` 수정, 실제 시계·외부 저장소·동시 호출, 문서에 없는 연구실 관행.

## 애매한 곳·가정
- `advanceTime`을 현재와 같은 시각으로 호출 — 성공하고 이벤트를 남긴다 ("현재 이상"이 유효 (가정: 요청 문구 그대로)).
- `receive`의 잘못된 `storageGrade` 값(세 가지 외) — `INVALID_INPUT` (가정).
- 분취 자식의 등급이 무엇인가 — 부모 등급 상속, 자식 용기가 맞지 않으면 `STORAGE_INCOMPATIBLE` (가정: `samples.ts` 정책 주석·storage.md가 이미 정함).
- 운송 목적지가 출발 용기와 같은 경우 — `CONTAINER_OCCUPIED` (가정: 출발 용기가 점유 중, storage.ts 점유 규칙).
- 격리·운송 중 시료의 새 예약 — 격리는 `QUARANTINED`, 운송 중은 허용 (가정: quality.md·transit.md가 이미 정함).
- 문서에 없는 수치 규칙 — 더하지 않는다 (가정: 수치는 요청·정책 문서에 적힌 것만 쓴다).

## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료 설정, 같은 값이어도 성공, 예약을 건드리지 않음. 격리 시 분취·새 예약·소비는 `QUARANTINED`
- [x] 보관 등급: 받기·분취 자식·이동·운송 목적지가 요구 등급 미지원이면 `STORAGE_INCOMPATIBLE`, 자식은 부모 등급 상속, 등급 대체 관계 없음
- [x] `advanceTime`: 절대 시각, 과거·비정수·범위 밖은 `INVALID_INPUT`, `expiresAt <= now` ACTIVE 예약 모두 `EXPIRED`(예약 양만 해제), 이벤트 하나
- [x] `reserve`의 `expiresAt`은 null 또는 현재보다 미래의 유효 시각, 아니면 `INVALID_INPUT`
- [x] 운송: 시작·도착·취소, 목적 용기 배타 확보, 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`, `UNKNOWN_TRANSIT`·`TRANSIT_CLOSED`·`ID_TAKEN`
- [x] 재전송·실패 원자성·이력이 새 명령에도 적용됨
- [x] `pnpm check` PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
