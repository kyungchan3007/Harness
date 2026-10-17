# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** 시료 보관 엔진(`src/lab/`)에 격리·보관 등급·예약 만료·운송 명령이 없거나 미구현이다(`quarantine`·`release`·`advanceTime`·`startTransit`·`confirmArrival`·`cancelTransit`이 throw). 보관 등급은 받기·분취·이동에 연결되지 않았고, 분취 자식 등급은 임시값(`AMBIENT`)이다.
- **목표:**
  1. 격리: `quarantine`·`release`로 ACTIVE 시료의 격리 여부를 설정(같은 값이어도 성공). 격리된 시료의 분취·새 예약·예약 소비는 `QUARANTINED`.
  2. 보관 등급: 받기·분취 자식·이동·운송 목적지에서 용기 지원 목록에 시료 요구 등급이 정확히 있어야 함, 아니면 `STORAGE_INCOMPATIBLE`. 분취 자식은 부모 등급을 상속.
  3. 예약 만료: `advanceTime(eventId, to)`로 논리 시각 진행(절대 시각, 과거는 `INVALID_INPUT`). `expiresAt <= now`인 ACTIVE 예약은 `EXPIRED`, 예약 양만 풂. 새 예약의 `expiresAt`은 `null` 또는 현재보다 큰 정수.
  4. 운송: `startTransit`→`confirmArrival`(도착, 시료를 목적 용기로) 또는 `cancelTransit`(취소, 시료는 출발 용기에). 운송 중 분취·소비·폐기·직접 이동·추가 운송은 `IN_TRANSIT`.
- **비목표:** `src/lab/types.ts` 변경(금지), 실제 시계·외부 저장소·동시 호출, 저장소 문서에 없는 연구실 관행 추가, 예약 부분 소비.

## 애매한 곳·가정
- 한 명령이 여러 규칙을 어길 때 어떤 오류 코드를 낼지 — 명령별 검사 순서를 정함 (가정: engine.md E6 4번대로 임의 순서 허용, 같은 시료 안에서는 상태 → 격리 → 운송 → 용기·용량 → 등급 순)
- 운송 목적지가 출발 용기와 같은 경우 — `CONTAINER_OCCUPIED` (가정: 출발 용기는 시료가 점유 중이므로 기존 점유 규칙으로 판정)
- 받기·운송·이동에서 `storageGrade`가 세 값 밖이면 — `INVALID_INPUT` (가정: 양 검사와 같은 입력 오류로 취급)
- `advanceTime`의 `to`가 현재와 같으면 — 성공하고 이벤트를 하나 남김 (가정: "현재 이상"이라는 요청 문구와 엔진의 "성공한 새 명령마다 이벤트" 규칙을 따름)
- 격리·해제 대상이 운송 중이어도 허용 — docs/quality.md·transit.md의 허용 목록 그대로 (확인됨: 문서 근거)

## Acceptance
- [x] 격리: `quarantine`·`release` 구현, 같은 값 재설정도 성공, 분취·새 예약·소비를 `QUARANTINED`로 거절, 예약·폐기·이동 등은 막지 않음
- [x] 보관 등급: 받기·분취 자식(부모 등급 상속)·이동·운송 목적지 적합성 검사, `STORAGE_INCOMPATIBLE`, 잘못된 등급 값은 `INVALID_INPUT`
- [x] 예약 만료: `advanceTime` 구현(과거 시각 `INVALID_INPUT`, 경계 포함 만료, 양만 풀림, 기록 남음), 새 예약 `expiresAt` 검증
- [x] 운송: `startTransit`·`confirmArrival`·`cancelTransit` 구현, 운송 중 `IN_TRANSIT` 금지 명령, 목적 용기 배타 확보, 끝난 운송 `TRANSIT_CLOSED`, 운송 ID 재사용 `ID_TAKEN`
- [x] 원자성·재전송·이력: 실패 시 상태·이벤트·eventId 무변화, 성공 이벤트 재전송은 처음 Receipt
- [x] 단위 테스트(`src/lab/lab.test.ts`) 추가 및 통과
- [x] `bash agents/harness/evals/checks.sh` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
