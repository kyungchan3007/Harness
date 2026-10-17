# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md) · 원문: [request.md](request.md)

## 설계
- **읽은 문서:** `AGENTS.md`, `src/lab/*.ts`(types 포함), `docs/engine.md`·`quality.md`·`storage.md`·`reservations.md`·`transit.md`, `agents/ontology/ontology.json`, `agents/ontology/check.test.ts`
- **접근:**
  - 상태에 운송 목적 확보 맵(`held: containerId → transitId`)을 추가한다. `Storage.isFree`가 점유(`occupied`)와 확보(`held`)를 함께 본다. 확보 맵은 `copyState`로 복사해 E6 원자성을 지킨다.
  - 시료가 운송 중인지는 ACTIVE 운송 중 같은 `sampleId`가 있는지로 본다(별도 인덱스 없음, 규모가 작음).
  - 격리는 `SampleView.quarantined`를 쓴다. 분취·새 예약·소비 앞에서 검사한다.
  - 등급 검사는 `Storage.supports`(정확 일치)를 쓴다. 받기·분취 자식·이동·운송 시작 앞에서 검사한다. 분취 자식은 `parent.storageGrade`를 상속하고, 자식 용기가 그 등급을 지원해야 한다.
  - 시각: 상태 `now`에 절대 시각을 넣는다. `advanceTime`은 `now ≤ to`일 때 `now = to`로 하고, `expiresAt ≤ to`인 ACTIVE 예약을 `EXPIRED`로 바꾸며 예약 양을 푼다. 이벤트는 하나다.
  - 운송: `startTransit`은 출발 용기 점유를 그대로 두고 목적 용기를 `held`에 넣는다. `confirmArrival`은 시료를 목적지로 옮기고 출발 점유를 지우며 확보를 푼다. `cancelTransit`은 확보만 푼다.
  - 모든 명령은 기존처럼 `engine.run`을 거친다. E5 재전송 판정이 먼저, 그다음 검사, 실패 시 상태 무변경.
- **대안·트레이드오프:**
  - 운송 목적지를 `occupied`에 같이 넣는 방법: 출발·목적을 구분하기 어려워 이동·도착 처리가 복잡해져서 버림.
  - 운송 중 시료의 출발 용기를 운송 객체로 찾는 방법: 이미 `SampleView.containerId`가 출발 용기를 가리키므로 불필요.
- **파일 계획:**
  - `src/lab/state.ts`: `held` 추가, `copyState` 복사, `inTransit` 헬퍼
  - `src/lab/storage.ts`: `isFree`가 `held` 확인, 등급 값 검증 헬퍼
  - `src/lab/samples.ts`: receive 등급 검사, split 등급 상속·검사·격리·운송 검사, move 등급·운송 검사, discard 운송 검사
  - `src/lab/reservations.ts`: reserve 만료 검증·격리 검사, consume 격리·운송 검사, advanceTime 구현
  - `src/lab/quality.ts`: quarantine·release 구현
  - `src/lab/transit.ts`: startTransit·confirmArrival·cancelTransit 구현
  - `src/lab/lab.test.ts`: 규칙별 단위 테스트 (신규)
  - 변경 없음: `src/lab/types.ts`, `docs/`, `agents/ontology/`
- **위험:**
  - 여러 규칙을 동시에 어기면 어떤 코드가 나올지 — 계약상 무엇이든 허용, 테스트는 코드 하나를 고정하지 않고 실패 여부만 본다(또는 구현 순서대로 고정).
  - 분취 자식 등급 상속으로 기존 동작이 바뀌는지 — 기존 테스트 없음, 기존 기능 유지는 `AMBIENT` 기본 용기에서 같은 결과.
- **검증 계획:**
  - `pnpm exec tsc --noEmit` 타입 검사
  - `pnpm onto:check` (불변식 I1~I14, 40개 시드 무작위 탐색)
  - `src/lab/lab.test.ts` 규칙별 단위 테스트
  - `pnpm check` 전체 게이트

## 계획과 달라진 점
- 운송 목적 확보 맵(`held`)·`isFree` 확장·`inTransit` 헬퍼는 계획대로.
- `startTransit`의 "출발 용기 자신" 판정은 별도 분기 없이 `isFree`(점유)로 처리됨(계획의 문구와 같은 결과).
- 단위 테스트는 계획의 "규칙별"을 `src/lab/lab.test.ts` 12건으로 구현. 등급 상속·만료 경계·운송 원자성 포함.

## 검증 결과
- `pnpm exec tsc --noEmit`: PASS
- `pnpm onto:check` (`agents/ontology/check.test.ts`, I1~I14, 시드 40개): 14/14 PASS (구현 전 I8·I9·I12·I13 실패 → 해결)
- `src/lab/lab.test.ts`: 12건 PASS
- `pnpm check`: ALL PASS (단위 테스트 154건, 태스크 기록 13개 확인)
- 웹·외부 조회 없음: `request.md`는 작업 파일 본문을 직접 옮김(`pnpm request` 미사용)
