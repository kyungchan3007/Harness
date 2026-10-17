# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1

## 요청 요약

기존 시료 보관 엔진(`src/lab/`)에 네 가지 기능을 추가합니다:
1. **격리** (`quarantine`, `release`) — 시료를 품질 확인이 끝날 때까지 쓰지 못하게 묶음
2. **보관 등급 적합성** (receive, split, move, startTransit) — 시료를 넣을 용기가 지원하는 등급 확인
3. **예약 만료** (`advanceTime`) — 논리 시각 진행 시 만료된 예약 자동 처리
4. **운송** (`startTransit`, `confirmArrival`, `cancelTransit`) — 시료를 다른 용기로 옮기는 2단계 절차

공개 계약(`src/lab/types.ts`)과 정책 문서(`docs/engine.md`, `quality.md`, `storage.md`, `reservations.md`, `transit.md`)에 명시된 규칙을 따릅니다.

## Acceptance

- [x] quality.ts: quarantine, release 구현, 격리 중에는 split/reserve/consume 거절
- [x] reservations.ts: advanceTime 구현, expiresAt <= now인 ACTIVE 예약을 EXPIRED로 변경
- [x] samples.ts/reservations.ts: 보관 등급 검증 (receive, split, move에서)
- [x] transit.ts: startTransit, confirmArrival, cancelTransit 구현
- [x] 운송 중 명령 제한: split, consume, discard, move, startTransit 거절
- [x] 기존 테스트 통과, pnpm check PASS

## 애매한 곳·가정

- 없음 — 정책 문서에 모든 규칙이 명시됨 (engine.md, quality.md, storage.md, reservations.md, transit.md)

## 범위

### 포함
- 모든 미구현 명령 완성
- 기존 명령에 새로운 검증 규칙 추가
- 정책 문서와 타입 계약 준수

### 제외
- `src/lab/types.ts` 수정
- 외부 저장소, 실제 시계, 동시 호출
- 새로운 규칙 (문서와 코드 계약만 따름)
