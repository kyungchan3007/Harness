# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1

## 목표

시료 보관 엔진의 기존 기능(시료 받기·분취·예약·폐기)을 그대로 유지하면서 네 가지 핵심 기능을 추가하여 실험실 운영의 품질 관리, 보관 조건 준수, 예약 수명 관리, 시료 운송을 지원한다.

## 범위

### 기존 기능 (변경 없음)
- 시료 받기(`receive`): 용기에 시료를 넣고 계보를 시작
- 시료 분취(`split`): ACTIVE 시료를 다른 용기의 자식으로 나눔
- 예약(`reserve`): 시료의 일정량을 예약
- 예약 취소(`cancel`): ACTIVE 예약을 취소하고 양을 풀음
- 예약 소비(`consume`): ACTIVE 예약의 양 전체를 씀
- 폐기(`discard`): ACTIVE 시료의 남은 양을 모두 버림
- 이동(`move`): ACTIVE 시료를 다른 빈 용기로 옮김
- 책임자 변경(`transferCustody`): ACTIVE 시료의 책임자 변경

### 새 기능
1. **격리** — `quarantine`, `release`
   - ACTIVE 시료를 일시적으로 사용 불가 상태로 표시 / 해제
   - 격리된 시료는 분취, 새 예약, 예약 소비 금지 (`QUARANTINED`)
   - 기존 예약·양·상태 영향 없음

2. **보관 등급** — 시료와 용기의 적합성 검증
   - 시료마다 요구 보관 등급 (`storageGrade`)
   - 용기마다 지원 등급 목록 (`supportedGrades`)
   - 받기·분취·이동·운송의 목적 용기가 시료 요구 등급을 정확히 지원하는지 검증
   - 맞지 않으면 `STORAGE_INCOMPATIBLE`

3. **예약 만료** — 논리 시각 진행에 따른 자동 만료
   - 논리 시각 `now`는 0에서 시작, `advanceTime(to)`로만 진행
   - 새 예약의 `expiresAt`는 `null`(기한 없음) 또는 현재보다 미래 시각
   - 시각 진행 시 `expiresAt <= now`인 ACTIVE 예약은 모두 `EXPIRED`
   - 만료는 예약 양만 풀고, 실제 남은 양·소비·폐기는 변경 없음

4. **운송** — 2단계 절차로 시료를 다른 용기로 이동
   - `startTransit`: 고유한 운송 ID로 운송 시작
     - 출발 용기 계속 점유, 목적 용기 배타적 확보
   - `confirmArrival`: 운송 완료, 시료를 목적 용기로 이동
   - `cancelTransit`: 운송 취소, 시료 출발 용기 유지, 목적 용기 확보 해제
   - 운송 중 금지: 분취, 소비, 폐기, 직접 이동, 추가 운송 시작 (`IN_TRANSIT`)

## 공개 계약 및 구현 규칙

### 공개 API (변경 없음)
- 진입점: `src/lab/lab.ts`의 `createLab(catalog: Catalog): Lab`
- 모든 명령은 `eventId`를 첫 인자로 받고, 결과는 `Result<Receipt>` 형태
- 실패는 `{ ok: false, code }` 반환 (예외 아님)

### 구현 제약
- `src/lab/types.ts` 수정 금지 (공개 계약이므로)
- 모든 구현은 `src/lab/` 내의 다른 파일에서 수행
- 메모리 내 처리만 (실시간 시계·외부 저장소·동시 처리 제외)

### 적용 규칙
1. **원자성 & 이력** (engine.md E6)
   - 성공한 새 명령마다 이벤트 기록, seq 증가
   - 실패 시 아무것도 변경되지 않음 (분취는 전부 또는 전무)

2. **재전송 처리** (engine.md E5)
   - 같은 `eventId`로 같은 명령 재전송 → 처음 Receipt 반환, 상태 변경 없음
   - 다른 명령 → `EVENT_CONFLICT`

3. **격리 규칙** (quality.md)
   - 기존 예약 영향 없음
   - 취소·이동·폐기·책임자 변경·운송·시각 진행은 허용
   - 다른 제약은 그대로 적용 (예: 예약 있으면 폐기 불가)

4. **보관 등급 규칙** (storage.md)
   - 목록에 요구 등급이 정확히 있어야 함 (대체 관계 없음)
   - 분취 자식의 등급은 부모로부터 상속 (src/lab/samples.ts 주석)

5. **예약 만료 규칙** (reservations.md)
   - `expiresAt <= now`일 때 만료 (경계 포함)
   - 만료된 예약은 기록 남음, 이후 `cancel`·`consume`은 `RESERVATION_CLOSED`

6. **운송 규칙** (transit.md)
   - 운송 ID 끝난 것도 포함 다시 쓸 수 없음 (`ID_TAKEN`)
   - 목적 용기는 다른 시료의 이동·분취, 다른 운송의 목적지로 쓸 수 없음
   - 도착·취소는 양·계보·책임자·등급·격리를 변경하지 않음

## 성공 조건

1. **함수형 정합성**
   - 기존 기능: 모든 기존 테스트 PASS
   - 새 기능: 각 기능에 대한 요구사항 검증 완료

2. **불변식 유지** (ontology.json의 I1~I14)
   - 계보 수량 보존 (I1)
   - 용기 점유 일관성 (I2, I14)
   - 용량·예약 범위 (I3, I4, I13)
   - 상태 비가역성 (I5)
   - 계보 불변성 (I6)
   - 이벤트 일관성 (I7~I11)
   - 보관 등급 적합성 (I12)

3. **문서 및 기록**
   - prd.md·sdd.md 완성
   - trace.md에 과정 기록
   - `pnpm check` PASS (타입·린트·테스트)

4. **예외 처리**
   - 정의된 ErrorCode 모두 구현 (QUARANTINED, STORAGE_INCOMPATIBLE, IN_TRANSIT 등)
   - 경계 케이스 처리 (만료 시각 정확히 만남, 운송 중 금지 명령 등)

## Acceptance

- [x] 격리된 시료는 분취·새 예약·예약 소비 거절 (QUARANTINED)
- [x] 보관 등급 검증: 받기·분취·이동·운송 시 목적 용기가 시료 등급 지원
- [x] 예약 만료: expiresAt ≤ now인 ACTIVE 예약은 EXPIRED로 변경
- [x] 운송: startTransit·confirmArrival·cancelTransit으로 시료 이동
- [x] 불변식 유지: 계보 수량, 용기 점유, 이벤트 seq 일관성
- [x] pnpm check PASS (타입·린트·테스트)

## 애매한 곳·가정

- 없음 — 기존 정책 문서(docs/*.md)와 ontology.json에서 모든 규칙이 명시됨
