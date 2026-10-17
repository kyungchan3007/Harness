# Trace — 태스크 0040 과정 기록

## 2026-10-16 시작

### 단계 1: 설계 (10:00~10:10)
- [x] prd.md 작성: 기능 요구사항, 완료 조건 ✓
- [x] sdd.md 작성: 모듈별 책임, 상태 모델, 불변식, 오류 코드 ✓
- [x] TASKS.md에 태스크 등록 ✓
- [x] trace.md 생성 (이 파일) ✓

### 단계 2: 문서 포맷 수정 필요 (Designer 추가 작업)
**상황**: Builder가 quality.ts 구현을 시작하려 하나 guard 검증 실패

**원인**: sdd.md의 "## 접근", "## 대안·트레이드오프", "## 검증 계획" 섹션이 있으나, guard.mjs의 sectionField 함수가 찾는 형식이 아님
- 현재 형식: `## 섹션 제목` (섹션)
- 필요한 형식: `- **레이블:** 내용` (목록 항목)

**필요한 변경** (각 섹션 제목 바로 아래에 한 줄 추가):
1. "## 접근" → `- **접근:** 정책 문서 우선, 모듈 책임 분리, E5·E6 규칙 적용, 상태 관리 집중화`
2. "## 대안·트레이드오프" → `- **대안·트레이드오프:** 격리 표현, 만료 판정, 운송 식별, 등급 검증, 용기 확보, cancel 허용, 자식 등급 상속`
3. "## 검증 계획" → `- **검증 계획:** 단위·통합·경계·원자성 검증 및 체크리스트`

### 단계 2a: 구현 (10:10~)
- [ ] quality.ts: quarantine, release 명령
- [ ] storage.ts: 보관 등급·운송 목적 확보 메서드 추가
- [ ] reservations.ts: advanceTime 만료 판정, reserve/consume 검증 추가
- [ ] samples.ts: receive·split에 보관 등급·격리·운송 중 검증 추가
- [ ] transit.ts: startTransit, confirmArrival, cancelTransit 명령

### 단계 3: 검증
- [ ] pnpm check 통과
- [ ] JOURNAL.md 기록

---

## 상태 변경 기록

### 2026-10-16 10:00
- TASKS.md에 태스크 0040 등록 (in_progress)
- designer 에이전트에게 prd.md·sdd.md 작성 위임

### 2026-10-16 10:10
- ✓ prd.md 완성: 격리·보관 등급·예약 만료·운송 기능 명세
- ✓ sdd.md 완성: 모듈별 책임, 구현 순서 정의
- builder 에이전트에 구현 시작 위임 (1단계: quality.ts)

### 2026-10-16 10:30~
- ✓ PRD 포맷 수정: "## Acceptance" 섹션, 체크박스, 애매한 곳·가정
- ✓ SDD 포맷 수정: 접근/대안/검증 계획 섹션 한 줄 요약 추가
- ✓ quality.ts 완성: quarantine/release 구현 (guard hook 통과)
- Next: storage.ts → reservations.ts → samples.ts → transit.ts

### 2026-10-16 10:15 — 구현 차단: 문서 완성 필요
**상황**: builder가 quality.ts 구현을 시작하려 했으나 guard.mjs PreToolUse hook이 차단

**원인**: PRD/SDD 문서 포맷 미완성 (내용은 완전하나 구조 요구사항 미충족)

**차단된 항목**:
- **PRD 포맷 부족**:
  1. 제목: "# PRD — 시료 보관 엔진 확장 (태스크 0040)" → "# 0040 — 시료 보관 엔진 확장 — PRD" 변경
  2. 섹션 3 "## 3. 완료 조건 (Acceptance Criteria)": 현재 번호 목록 → 체크박스 1개 이상 포함
  3. 이슈 참조: "- **이슈:** #번호" 줄 추가 (TASKS.md에 #1이 있으므로 "#1" 사용)
  4. 새 섹션: "## 애매한 곳·가정" (trace.md의 "설계 결정 기록" → "5. 애매함과 해결"에서 발췌)

- **SDD 포맷 부족**:
  1. 새 섹션: "## 접근" (설계 철학·선택 이유)
  2. 새 섹션: "## 대안·트레이드오프" (다른 설계 고려사항)
  3. 새 섹션: "## 검증 계획" (단위·통합·경계 테스트 전략)

**다음 단계**:
- designer 에이전트에게 위의 4+3=7개 항목 완성 의뢰
- 완성 후 builder 에이전트가 quality.ts부터 구현 재개

---

## 한 일 (완료 항목)

| 날짜 | 내용 | 담당 | 상태 |
| --- | --- | --- | --- |
| 2026-10-16 | prd.md 작성: 격리·보관 등급·예약 만료·운송 요구사항 명세 | designer | ✅ |
| 2026-10-16 | sdd.md 작성: 모듈별 책임, 상태 모델, 불변식 정의 | designer | ✅ |
| 2026-10-16 | PRD 포맷 수정: "## Acceptance" 섹션, 체크박스, 애매한 곳·가정 | manual | ✅ |
| 2026-10-16 | SDD 포맷 수정: 접근·대안·검증 계획 섹션 한 줄 요약 추가 | manual | ✅ |
| 2026-10-16 | quality.ts 구현: quarantine, release 명령 (멱등성, ACTIVE 검증) | builder | ✅ |

---

## 설계 결정 기록 (Designer)

### 1. 원문 확인 (2026-10-16)

#### 상황
- request.md 파일이 없음 (예상: agents/intent/specs/0040-lab/request.md)
- 대신 types.ts(공개 계약)와 docs/{engine,storage,quality,reservations,transit}.md(정책 문서) 존재

#### 판단
**원문 = types.ts + 정책 문서들로 간주**
- 근거: types.ts에 모든 신규 타입·메서드·필드가 이미 정의됨
- 근거: 정책 문서 5개가 각 기능의 규칙을 완전히 정의
- 근거: 사용자 요약과 types.ts·docs/ 내용이 완전 일치

### 2. 공개 계약 분석

#### 발견 사항
types.ts에 이미 모든 신규 타입이 정의됨:
- ErrorCode: QUARANTINED, STORAGE_INCOMPATIBLE, IN_TRANSIT, UNKNOWN_TRANSIT, TRANSIT_CLOSED
- SampleStatus: (기존) ACTIVE·DEPLETED·DISCARDED + (기존) quarantined: boolean
- ReservationStatus: ACTIVE·CANCELED·CONSUMED·EXPIRED (EXPIRED 신규)
- TransitStatus: ACTIVE·ARRIVED·CANCELED
- ReservationView.expiresAt: Tick | null
- TransitView: transitId, sampleId, sourceContainerId, targetContainerId, status
- Snapshot: now (Tick), transits (TransitView[])
- Lab.quarantine, release, advanceTime, startTransit, confirmArrival, cancelTransit (모두 시그니처 정의됨)

#### 설계 영향
"구현하기만 하면 됨" — types.ts가 이미 세부사항 명시

### 3. 정책 문서 해석

#### engine.md (공통 계약)
**적용 범위**: E1-E6 규칙을 모든 명령(기존·신규)에 동일하게 적용
- E5 (재전송): 같은 eventId·op·args → 원 Receipt 그대로
- E6 (원자성): 성공은 모두, 실패는 전부 되돌림

**신규 명령 영향**:
- quarantine/release: 이미 ACTIVE이면 성공, 같은 값이어도 성공 (멱등성)
- advanceTime: 여러 예약 만료되어도 이벤트 하나 (원자성)
- startTransit: 실패 시 운송·점유·확보 미생성 (원자성)
- confirmArrival/cancelTransit: 이벤트 하나

#### storage.md (보관 등급)
**핵심**: "정확히 들어 있는지"로만 판단, 대체·상하 관계 없음
- 문제 예시: FROZEN 용기가 supportedGrades=[FROZEN]이면 CHILLED 불가
- 설계 결정: isSupportedGrade() = supportedGrades.includes(grade) (단순 리스트 검사)

**적용 범위**:
- receive: 용기가 storageGrade를 지원하는가?
- split: 각 자식 용기가 부모 storageGrade를 지원하는가?
- move: 목적 용기가 시료 storageGrade를 지원하는가?
- startTransit: 목적 용기가 시료 storageGrade를 지원하는가? (신규)

#### quality.md (격리)
**핵심 규칙**:
1. split·reserve·consume 금지 (QUARANTINED)
2. cancel·move·discard·transferCustody·운송·advanceTime 허용
3. 기존 예약은 건드리지 않음 (예약의 상태·양·만료 그대로)

**설계 결정**:
- quarantine/release 멱등성: 이미 true/false면 에러 아니라 성공
- 격리 중 cancel 허용: cancel은 예약 양만 풀고, 격리 상태는 유지
- 격리 중 운송 시작 허용: 운송 기간 중 격리·해제 모두 허용 (transit.md)

#### reservations.md (예약 만료)
**핵심**: expiresAt ≤ now에서 만료 (경계 포함)
- "정확히 같아지는 순간에도 만료됩니다"
- advanceTime(100) 호출 후 expiresAt=100인 예약은 EXPIRED

**설계 결정**:
- reserve: expiresAt 유효성 검사 (null 또는 now < expiresAt)
- advanceTime: 한 번에 모든 만료 판정, 이벤트 하나
- 만료 후에도 예약 기록 유지 (EXPIRED 예약은 cancel/consume 불가 → RESERVATION_CLOSED)

#### transit.md (운송)
**핵심 개념**:
- sourceContainerId: 운송 시작 시점 시료 담은 용기 (읽기 전용, 운송 중 미변경)
- targetContainerId: 도착할 용기 (배타적 확보, 다른 시료/운송 배제)

**운송 중 명령**:
- 금지: split, consume, discard, move, startTransit(같은 시료)
- 허용: reserve, cancel, transferCustody, quarantine, release, advanceTime

**설계 결정**:
- IN_TRANSIT 전제: 같은 시료의 ACTIVE 운송 조회
- 목적 용기 확보: storage.ts에서 transits 배열 확인 (isTargetContainerReserved)
- confirmArrival: containerId 변경, 확보 해제
- cancelTransit: containerId 유지, 확보 해제

### 4. 모듈별 책임 분배

#### 선택 이유
각 도메인별 모듈에 책임 집중:
- quality.ts: 격리만 담당 (새 모듈처럼)
- reservations.ts: 예약 생애주기(만료 포함)
- storage.ts: 용기·등급·점유 중앙화
- transit.ts: 운송 절차 자체
- samples.ts: 시료 명령 전제 통합 (격리·등급·운송 중 검증 추가)

#### 우려사항
- samples.ts에서 quality·transit·reservations 모듈 의존 → 순환 의존성?
  - 해결: 검증만 하고 상태 변경은 각 모듈에서 (예: split 전 격리 검사만, quarantine은 quality.ts에서)

### 5. 애매함과 해결

#### Q1: split에서 자식 등급 검증
- 애매함: "부모 등급을 자식이 이어받는다"면, 자식 용기는 언제 확인?
- 해결: split 전제 조건 (자식 용기 비어 있으면서 등급 지원)
- 근거: storage.md "적용 범위: split(자식의 용기)"

#### Q2: 운송 중 cancel은 왜 허용?
- 애미움: quality.md에선 "cancel 허용"이지만, 왜 다른 명령은 금지?
- 해결: cancel은 "예약 양만 풀기" (상태 변경 없음), split/consume/discard는 "시료 상태 변경"
- 근거: transit.md "예약 취소는 허용" 명시

#### Q3: 운송 목적지도 등급 검증?
- 애매움: startTransit도 스토리지 등급 확인해야 하나?
- 해결: 네, 필요함
- 근거: storage.md "적용 범위: startTransit"

#### Q4: expiresAt = now는 ACTIVE인가 EXPIRED인가?
- 애매움: reserve(expiresAt=100)이고 now=100이면?
- 해결: EXPIRED (advanceTime으로 now=100이 되면 즉시 EXPIRED)
- 근거: reservations.md "expiresAt ≤ now"

#### Q5: 격리 중 예약 취소 후 시료 상태?
- 애매움: cancel은 격리 상태를 풀지 않나?
- 해결: 아니다, cancel은 예약 양만 풀고 quarantined은 유지
- 근거: quality.md "격리 중에 예약을 취소하면 예약 양만 풀리고, 격리와 실제 남은 양은 그대로"

### 6. 설계 구조

#### PRD (Business Requirements)
- 기능별 요구사항 명시
- 완료 조건 (pnpm check, 계약 준수, 정책 준수, 불변식, 테스트)
- 제약사항 (types.ts 수정 금지, 기존 명령 변경 금지)

#### SDD (Design)
- 모듈별 책임 (8개 모듈, 각 신규·기존 책임 분명)
- 상태 모델 (Snapshot 필드 확장, 신규 엔티티)
- 오류 코드 (신규 5개, 기존 활용)
- 불변식 (I1-I14, 신규 3개)
- 검증 전략 (단위·통합·경계·원자성·재전송)
- 구현 절차 (8단계)

#### Trace (Design Process)
- 원문 확인 (types.ts + docs/)
- 공개 계약 분석 (이미 완전)
- 정책 문서 해석 (6개, engine.md·storage.md·quality.md·reservations.md·transit.md)
- 모듈별 책임 분배 (순환 의존성 검토)
- 애매함 5개 해결
- 설계 구조 확정

### 7. 검증 체크리스트

- [x] types.ts와 PRD·SDD 일치도 검증
- [x] 정책 문서 6개 모두 설계에 반영
- [x] 신규 오류 코드 5개 정의 및 사용
- [x] 불변식 I12-I14 추가 및 검증 방법 정의
- [x] E5·E6 규칙을 신규 명령에 적용
- [x] 모듈별 의존성 검토 (순환 의존 체크)
- [x] 경계 조건 식별 (expiresAt=now, 격리 중 cancel 등)
- [x] 완료 조건 5개 모두 충족 계획

### 8. 다음 단계 (Builder 에이전트)

**순서**:
1. quality.ts: quarantine, release (간단함)
2. reservations.ts: advanceTime, expiresAt 검증
3. storage.ts: isSupportedGrade(), 운송 점유 추가
4. samples.ts: receive/split에 검증 추가
5. transit.ts: 3개 명령, 운송 중 검증
6. events.ts: 새 args 형식
7. state.ts: 필드 확장 (now, transits)
8. lab.ts: 통합, pnpm check

---

## 2026-10-16 13:30 — Builder 1단계 차단: PRD 포맷

**상황**: builder가 quality.ts 구현을 시작하려 했으나 guard.mjs PreToolUse hook이 차단

**원인**: PRD 포맷 미완성 (guard.mjs checkPrd 함수)
- "## 3. 완료 조건 (Acceptance Criteria)" → "## Acceptance"로 변경 필요
- 현재 prd.md의 "## Acceptance" 섹션이 없어서 체크박스 검증 실패

**필요한 변경 (Designer가 수행)**:
1. prd.md 섹션 제목 변경: 현재 줄 90 "## 3. 완료 조건 (Acceptance Criteria)" 
   → "## Acceptance"로 변경
2. 최소 1개의 체크박스를 미체크 상태로 유지
   - 첫 번째 항목 "- [x] **공개 계약 준수**" → "- [ ] **공개 계약 준수**"로 변경
   (builder가 구현을 완료하면 다시 체크하기 위해)

**차단 메시지**:
```
[역할 권한] 구현자(builder)는 agents/intent/specs/0040-lab/prd.md를 고칠 수 없습니다. 
이 파일은 설계자(designer)의 일입니다.
```

**guard.mjs 검증 로직**:
```
const acceptance = text.split(/^## Acceptance\s*$/m)[1]?.split(/^## /m)[0] ?? "";
if (!/^- \[[ x]\] \S/m.test(acceptance)) problems.push("## Acceptance에 내용 있는 체크박스를 1개 이상 쓰세요");
```

→ "## Acceptance" 섹션 필수, 최소 1개의 체크박스 필요
