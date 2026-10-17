# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 엔진은 받기·분취·예약·소비·폐기·이동·책임자 변경만 지원한다. 격리·보관 등급·예약 만료·운송은 `types.ts`에 계약만 있고 구현이 미완성(throw)이다.
- **목표:** 기존 기능(재전송·원자성·이력·계보 보존)을 유지하면서 네 기능을 `docs/` 정책과 `types.ts` 계약대로 구현한다.
- **비목표:** `src/lab/types.ts` 수정, 실제 시계·외부 저장소·동시 호출, 저장소에 적히지 않은 연구실 관행 추가.

## 요구 (원문 요약)
- 격리: `quarantine`·`release`는 ACTIVE 시료의 격리 여부를 설정(같은 값이어도 성공). 격리 시 분취·새 예약·예약 소비는 `QUARANTINED`.
- 보관 등급: 받기·분취 자식·이동·운송 목적지가 시료의 요구 등급을 지원하지 않으면 `STORAGE_INCOMPATIBLE`.
- 예약 만료: `advanceTime(to)`는 현재 이상의 유효 절대 시각. 만료 `expiresAt <= now`인 ACTIVE 예약은 `EXPIRED`, 예약 양만 풀림. 새 예약의 `expiresAt`은 null 또는 현재보다 큰 유효 정수.
- 운송: `startTransit` → `confirmArrival`(시료를 목적 용기로, `ARRIVED`) 또는 `cancelTransit`(출발 용기 유지, `CANCELED`, 목적 확보 해제). 운송 중 분취·소비·폐기·직접 이동·추가 운송은 `IN_TRANSIT`.

## 애매한 곳·가정
- 분취 자식의 보관 등급은 부모 등급을 상속한다. 정책 명시 (확인됨: docs/storage.md, samples.ts 주석). 기존 TODO 임시값 AMBIENT는 제거.
- 분취 자식 용기도 부모 등급을 지원해야 한다. 정책 명시 (확인됨: docs/storage.md 적용 범위).
- 목적 용기 확보는 storage.ts의 isFree에 반영한다. 정책 명시 (확인됨: docs/transit.md, storage.ts 주석).
- 여러 규칙을 어기면 어긴 규칙 중 어느 코드든 허용한다. 정책 명시 (확인됨: docs/engine.md E6.4).
- advanceTime의 to가 now와 같으면 성공하는 새 이벤트다. 현재 이상이면 허용한다는 요청 문구 해석 (가정).
- 운송 ID 공간은 시료·예약 ID와 분리되고, 끝난 운송 ID도 ID_TAKEN이다. 정책 명시 (확인됨: docs/transit.md).

## Acceptance
- [x] `quarantine`·`release`: ACTIVE 시료 격리 설정, 같은 값 재설정 성공, 끝난 시료 `NOT_ACTIVE`
- [x] 격리 시 `split`·`reserve`·`consume`은 `QUARANTINED`, 격리 중 `cancel`·`move`·`discard`·`transferCustody`·운송은 허용
- [x] `receive`·`split` 자식·`move`·`startTransit` 목적지의 보관 등급 불일치는 `STORAGE_INCOMPATIBLE`, 등급 정확 일치만 허용
- [x] 분취 자식 등급은 부모 등급을 상속하고 자식 용기도 그 등급을 지원해야 함
- [x] `advanceTime`: 과거 시각·비정수 `INVALID_INPUT`, 만료 경계(`expiresAt == now`) 포함 `EXPIRED`, 예약 양만 풀림, 이벤트 하나
- [x] `reserve`: `expiresAt`이 null 또는 now보다 큰 유효 정수가 아니면 `INVALID_INPUT`
- [x] 운송: 시작·도착·취소 동작, 목적 용기 배타 확보, 운송 중 금지 명령 `IN_TRANSIT`, 끝난 운송 `TRANSIT_CLOSED`, 재사용 `ID_TAKEN`, 없는 운송 `UNKNOWN_TRANSIT`
- [x] 실패 시 상태·이력·eventId 무변화, 같은 eventId 재전송 규칙(E5) 유지 (테스트)
- [x] 단위 테스트 추가, `bash agents/harness/evals/checks.sh` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
