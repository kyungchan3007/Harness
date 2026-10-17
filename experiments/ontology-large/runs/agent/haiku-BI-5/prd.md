# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** 시료 보관 엔진(`src/lab/`)에 격리·보관 등급·예약 만료·운송 명령이 미구현이다. 공개 계약(`src/lab/types.ts`)의 새 필드와 메서드 연결도 비어 있다.
- **목표:**
  - 기존 명령(받기·분취·예약·취소·소비·폐기·이동·책임자 변경)의 동작을 유지한 채 네 기능을 추가한다.
  - 판정 기준은 `docs/`의 정책 문서 다섯 개와 `types.ts`, 구현 모듈 주석이다.
- **비목표:**
  - `src/lab/types.ts` 수정.
  - 실제 시계·외부 저장소·동시 호출 처리.
  - 저장소에 적히지 않은 실제 연구실 관행 추가.

## 요구 (원문: [request.md](request.md))
- **격리:** `quarantine`·`release`는 ACTIVE 시료의 격리 여부를 설정하고 같은 값이어도 성공한다. 격리된 시료의 분취·새 예약·예약 소비는 `QUARANTINED`.
- **보관 등급:** 받기·분취·이동·운송 목적지가 시료의 요구 등급을 지원하지 않으면 `STORAGE_INCOMPATIBLE`. 분취 자식은 부모 등급을 상속한다.
- **예약 만료:** `advanceTime`은 현재 이상의 유효 절대 시각을 받는다. 새 예약의 `expiresAt`은 `null` 또는 현재보다 큰 유효 정수. 만료된 ACTIVE 예약은 `EXPIRED`가 되고 예약 양만 푼다.
- **운송:** `startTransit`·`confirmArrival`·`cancelTransit`. 운송 중에는 분취·소비·폐기·직접 이동·추가 운송 시작을 `IN_TRANSIT`으로 거절.

## 애매한 곳·가정
- 분취 자식의 등급: 정책(`storage.md`)대로 부모 등급 상속 (확인됨: storage.md 명시)
- 운송 중 예약 생성·취소·격리·책임자 변경·시각 진행은 허용 (확인됨: transit.md 명시)
- 운송 목적 용기 확보 표현: `State`에 용기→운송 ID 맵(`claims`)을 추가해 구현 (내부 구현 선택, 공개 계약 아님) (가정)
- 여러 규칙을 동시에 어기는 호출은 어긴 규칙 중 하나의 코드를 돌려줘도 됨 (`engine.md` E6.4). 검사 순서는 sdd.md에 적음 (가정)
- `advanceTime`에 현재와 같은 시각(`to === now`)은 허용하고 이벤트를 하나 남긴다 (확인됨: types.ts·engine 규칙의 "now 이상" 문구)

## Acceptance
- [x] `quarantine`·`release`: 같은 값도 성공, 예약 상태·양·만료는 그대로 (단위 테스트)
- [x] 격리 시료의 분취·새 예약·예약 소비 → `QUARANTINED`, 격리 중 예약 취소는 성공 (단위 테스트)
- [x] 받기·분취·이동·운송 목적지 등급 불일치 → `STORAGE_INCOMPATIBLE`, 분취 자식 등급 = 부모 등급 (단위 테스트)
- [x] `advanceTime`: 과거 시각·비정수 → `INVALID_INPUT`, `expiresAt <= now` 예약 `EXPIRED`·예약 양 해제, 남은 양 불변, 이벤트 하나 (단위 테스트)
- [x] 새 예약 `expiresAt`: null 또는 미래 정수만 허용 (단위 테스트)
- [x] 운송 시작·도착·취소: 목적 용기 확보·해제, 도착 시 시료 이동, 취소 시 출발 용기 유지, 끝난 운송 `TRANSIT_CLOSED`, 운송 ID 재사용 `ID_TAKEN` (단위 테스트)
- [x] 운송 중 분취·소비·폐기·이동 → `IN_TRANSIT`, 운송 중 예약·격리·책임자 변경은 허용 (단위 테스트)
- [x] 실패한 명령은 아무것도 바꾸지 않음, 재전송은 처음 Receipt 반환 (단위 테스트)
- [x] `bash agents/harness/evals/checks.sh` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
