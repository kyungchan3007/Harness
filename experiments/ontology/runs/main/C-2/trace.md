# 0040: 연구실 시료 보관 엔진 — 과정 기록 (trace)

작업 과정 중 설계 결정과 판단을 기록합니다.

## 2026-10-16: 구현 시작

### 초기 계획
1. **Lab 클래스 구현** (LabImpl)
   - 멱등성 (R7): checkIdempotency 헬퍼 함수
   - 검증-변경 분리: executeCommand 래퍼
   - 깊은 복사: deepCopy 함수
   - 인자 비교: argsEqual 함수 (키 순서 무시, 배열 순서 구별)

2. **8개 명령 메서드**
   - receive: 신규 시료 수용
   - split: 분취 (원자성: 모두-성공 또는 모두-실패)
   - reserve: 예약
   - cancel: 예약 취소
   - consume: 소비
   - discard: 폐기
   - move: 용기 이동
   - transferCustody: 책임자 변경

3. **내부 상태 구조**
   - samples: Map<ID, SampleState>
   - reservations: Map<ID, ReservationState>
   - containerUsage: Map<ID, ID | null>
   - successfulEvents: Map<ID, { op, args, receipt }>
   - events: EventView[] (이력)
   - nextSeq: 명령 시퀀스 번호

4. **규칙 맵핑**
   - R1: ID 유일성, 참조 유효성, 용기 점유, 용량 제약
   - R2: 계보 고정, 양의 합 보존
   - R3: 이용 가능량, 예약 제약, 소비
   - R4: 상태 전이 (ACTIVE → DEPLETED/DISCARDED)
   - R5: 용기 위치, 이동, split 용기 할당
   - R6: 책임자 상속, 변경 독립성
   - R7: 멱등성 (eventId 확인이 가장 먼저)
   - R8: 원자성 (검증 통과 후 상태 변경), 이력 로깅, split 원자성

### 실제 진행
**2026-10-16: guard hook 차단 및 재차 차단**

**1단계 - 초기 차단**
- 문제: guard hook이 prd.md의 Acceptance 체크박스를 요구
- 구현자는 prd 수정 불가 → 조율자에게 요청
- 조율자가 prd.md의 A0 섹션 체크박스를 [x]로 체크해줌

**2단계 - 재차 차단**
- 조율자 수정 후에도 guard hook이 동일한 메시지로 차단
- PRD 파일 Re-Read 확인: 실제로 239-241번 줄에 `[x]` 체크박스 존재
- 추측: (a) hook이 파일 캐시 사용, (b) 정규식 매칭 실패, (c) 다른 문제
- 참조: records.mjs 라인 76 정규식 `/^- \[[ x]\] \S/m` — "## Acceptance" 섹션 내 체크박스 판정

**3단계 - 상태 분석**
- TASKS.md 확인: 0040 행의 status는 "working" (기준: todo, in-progress, done, blocked)
- 의심사항: status 형식이나 다른 검증 항목 문제 가능성

**현재 상태: 막힘 (blocked)**
- src/lab/lab.ts 작성 불가 (guard hook PreToolUse 차단)
- 원인: prd.md Acceptance 체크박스 검증 실패 (구현자는 prd 수정 권한 없음)
- 필요: 조율자의 재검토 및 해결책 제시
