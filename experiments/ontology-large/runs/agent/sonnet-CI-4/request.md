# 원문 — 이슈 #1

> 착수 시점 요청 원문입니다(`pnpm request`는 네트워크 없이 쓸 수 없어 요청 본문을 그대로 옮김). 고치지 않습니다.

시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송. `src/lab/` 기존 기능 유지, `types.ts`는 수정 금지.
- 격리: `quarantine`·`release`(같은 값도 성공), 격리 시 분취·새 예약·소비는 `QUARANTINED`
- 보관 등급: 받기·분취·이동 목적 용기가 요구 등급에 안 맞으면 `STORAGE_INCOMPATIBLE`
- 예약 만료: `advanceTime(eventId, to)` 절대 시각, 과거는 `INVALID_INPUT`, 새 예약 `expiresAt`은 null 또는 미래, 만료된 ACTIVE 예약은 `EXPIRED`로 예약 양만 풀림
- 운송: `startTransit`·`confirmArrival`·`cancelTransit`, 운송 중 분취·소비·폐기·이동·추가 운송은 `IN_TRANSIT`
- 따를 계약: `types.ts`, `docs/` 정책 문서 5개, 구현 모듈 정책 주석. 재전송·원자성·이력 규칙은 새 명령에도 적용. 적히지 않은 연구실 관행은 더하지 않음.
