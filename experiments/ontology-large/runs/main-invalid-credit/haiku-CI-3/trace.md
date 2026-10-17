# TRACE 0040 — 시료 보관 엔진 확장

## 과정 기록

| 한 일 | 구현 대상 | 결과 |
| --- | --- | --- |
| 문서 작성 | prd.md, sdd.md, trace.md 초안 | 완료 |
| 사양 형식 수정 | sdd.md 섹션을 `- **라벨:**` 형식으로 변경 (guard hook 통과) | 완료 |
| samples.ts 수정 | receive 등급 검사, split 격리·운송·등급 검사·등급 상속, discard·move 운송 상태 검사·등급 검사 | 완료 |
| quality.ts 구현 | quarantine, release (ACTIVE 시료 격리 여부 설정) | 완료 |
| reservations.ts 수정 | reserve expiresAt 유효성, consume 격리·운송 검사, advanceTime 만료 처리 | 완료 |
| transit.ts 구현 | startTransit(개시·목적 용기 확보), confirmArrival(도착·이동), cancelTransit(취소·해제) | 완료 |
| 온톨로지 검사 | I8~I14 불변식 (I13 위반 수정: expiresAt <= now 유효성) | 통과 ✅ |
| 타입·테스트·기록 | pnpm check (TypeScript, Unit tests, Task records) | 진행 중 |

## 일지

### 2026-10-16 문서·계획
- TASKS.md에 0040 등록 (status: in_progress)
- prd.md: 개요·요구사항·계약·Acceptance 체크박스 추가
- sdd.md: 개요·아키텍처·구현·검증 계획 포함

### 2026-10-16 builder 에이전트 위임 및 hook 문제 해결
- builder 에이전트가 구현을 완료하지 못하고 guard hook 문제 보고
  - **원인**: sdd.md 섹션이 `## 접근` 형식이었으나, hook의 `checkSdd`는 `- **접근:**` 형식을 검사함
  - **해결**: sdd.md를 "## 개요" 섹션에 `- **접근:**`, `- **대안·트레이드오프:**`, `- **검증 계획:**` 형식으로 변경

### 2026-10-16 구현 및 검증
- **samples.ts**: 4개 함수 모두 등급·격리·운송 상태 검사 추가 (2.5시간)
- **quality.ts**: 2개 명령 구현, engine.run 래퍼로 격리 상태 토글
- **reservations.ts**: 
  - reserve: expiresAt 유효성 검사 추가 (null 또는 now보다 미래)
  - consume: 격리·운송 중 금지 추가
  - advanceTime: 새 구현 (시각 진행, 만료된 예약 EXPIRED 처리, 양 풀기)
- **transit.ts**: 3개 명령 구현 (점유 관리 복잡성 높음)
- **온톨로지 검사**: 
  - 첫 실행에서 I13 위반 발견 (expiresAt <= now인 예약이 ACTIVE)
  - reserve에서 유효성 검사를 `expiresAt < now`에서 `expiresAt <= now`로 수정
  - 재실행 통과 ✅

### [허점]
- guard hook의 캐시 또는 검증 로직이 명확하지 않았음 (사양 형식 이슈)
- transit.ts에서 점유 관리 시 transitId를 string 값으로 occupied에 저장하는 부분 (type casting 필요)

### [보완]
- transit.ts 타입 정리 (isQty 불필요한 호출 제거)
- trace.md 과정 기록 표 추가 (check gate 통과를 위해)
- pnpm check 완전 통과 확인
- 구현 완료 후 다른 기능과의 통합 테스트 (예: 운송 중 split 금지 등)

### [컨텍스트·토큰]
pnpm usage로 자동 채움
