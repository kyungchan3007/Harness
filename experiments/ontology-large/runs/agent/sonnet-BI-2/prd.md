# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 시작 코드는 격리·시각 진행·운송이 미구현(throw)이고, 보관 등급은 받기에 연결되지 않았으며 분취 자식 등급은 임시값(AMBIENT)이다.
- **목표:**
  1. 격리(`quarantine`·`release`)와 `QUARANTINED` 거절(분취·새 예약·소비).
  2. 보관 등급 적합성(받기·분취·이동·운송 목적지, 정확 일치)과 분취 자식의 부모 등급 상속.
  3. `advanceTime`·예약 만료(`expiresAt <= now`는 EXPIRED, 예약 양만 해제)와 `expiresAt` 검증.
  4. 운송 3명령과 `IN_TRANSIT` 거절, 목적 용기 배타 확보.
  5. 기존 재전송·원자성·이력 규칙을 새 명령에도 적용.
- **비목표:** `types.ts` 변경, 문서에 없는 연구실 관행 추가, 실제 시계·동시성.

## 애매한 곳·가정
- 분취 자식 등급 — `samples.ts` 정책 주석대로 부모 등급 상속, 자식 용기가 그 등급을 지원해야 함 (확인됨: samples.ts 주석, storage.md)
- 운송 목적 용기 확보 판정 — `storage.ts`의 `isFree`에서 ACTIVE 운송 목적지를 점유로 본다 (확인됨: storage.ts 주석, transit.md)
- `advanceTime(to === now)` — 허용, 이벤트 하나를 남긴다 (가정: "현재 이상"이므로 같은 값도 유효)
- 받기의 `storageGrade`가 세 값이 아니면 `INVALID_INPUT` (가정: 계약 타입 밖 값은 입력 오류)
- `expiresAt`/`to`의 유효 시각 — 0 이상 `MAX_SAFE_INTEGER` 이하 정수, `expiresAt`은 추가로 `> now` (확인됨: types.ts Tick, 요청)
- 여러 규칙을 동시에 어기는 호출의 오류 코드 — 어느 것이든 허용 (확인됨: engine.md E6.4)

## Acceptance
- [x] 격리·해제 구현 + `QUARANTINED` 거절(분취·예약·소비), 취소·이동·폐기·책임자 변경·운송은 막지 않음
- [x] 보관 등급 적합성(받기·분취·이동·운송)과 분취 자식 등급 상속
- [x] `advanceTime`·예약 만료·`expiresAt` 검증
- [x] 운송 시작·도착·취소와 `IN_TRANSIT` 거절, 목적 용기 배타 확보, 끝난 운송 ID 재사용 금지
- [x] 재전송(E5)·원자성(E6) 새 명령 포함 단위 테스트
- [x] `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
