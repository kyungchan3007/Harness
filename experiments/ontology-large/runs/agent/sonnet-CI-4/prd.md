# 0040 — 시료 보관 엔진 확장 (격리·보관 등급·예약 만료·운송) — PRD

- **이슈:** #1
- **문제:** `src/lab/`의 격리·시각 진행·운송은 미구현이고, 보관 등급은 받기·분취·이동에 연결되지 않았으며, 분취 자식 등급이 임시값 AMBIENT였다.
- **목표:** 요청과 `docs/` 정책 5개, 코드 정책 주석대로 새 기능을 구현하고 기존 동작을 유지한다.
- **비목표:** `types.ts` 수정, 문서에 없는 연구실 관행 추가.

## 애매한 곳·가정
- 분취 자식의 보관 등급 — `samples.ts` 정책 주석대로 부모 등급 상속 (확인됨: 코드 주석)
- 운송 목적 용기 확보 표시 — 점유 맵에 `transit:<id>` 값으로 기록해 받기·분취·이동·다른 운송에서 CONTAINER_OCCUPIED (가정: `storage.ts` 점유 정책)
- `advanceTime`의 `to`가 현재와 같음 — 성공, 이벤트 하나 기록 (가정: "현재 이상")
- 잘못된 `storageGrade` 값 — `INVALID_INPUT` (가정: 엔진 공통 계약의 값 검사)
- 운송 시작 시 용량 초과 — `CAPACITY_EXCEEDED` (가정: E1 3, 용기에 넣는 모든 경우)

## Acceptance
- [x] 격리·해제와 `QUARANTINED` 거절(분취·새 예약·소비), 이미 있는 예약 불변
- [x] 보관 등급 정확 일치 검사를 받기·분취·이동·운송에 연결, 자식 등급 상속
- [x] `advanceTime`·`expiresAt` 검증과 경계 포함 만료
- [x] 운송 시작·도착·취소, 목적 용기 배타 확보, 운송 중 금지 명령 `IN_TRANSIT`
- [x] 단위 테스트(`src/lab/lab.test.ts`)와 `pnpm check` ALL PASS

설계와 검증 결과: [sdd.md](sdd.md) · 과정 기록: [trace.md](trace.md)
