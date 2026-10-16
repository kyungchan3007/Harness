**병렬 실행은 조건부 수용합니다. 다만 “묶음 안 3~6개”가 아니라 “같은 모델의 세 조건을 정확히 3개씩 병렬 실행”으로 고정하는 것이 좋습니다.** 공개 계약과 규칙 배치는 아래 안을 권합니다. [1라운드 검토](/Users/chan/Documents/develop/harness-lab/agents/intent/specs/0038-ontology-large-task/codex-r1.md), [기존 타입](/Users/chan/Documents/develop/harness-lab/experiments/ontology/types.ts), [기준 구현](/Users/chan/Documents/develop/harness-lab/experiments/ontology/reference/lab.ts)을 확인했으며, 파일은 수정하지 않았습니다.

**1. 병렬 실행 판정**

같은 시간대·계정이라는 사실만으로 공정성이 확보되지는 않습니다. 조건마다 호출량과 실행 길이가 달라 공유 한도를 서로 소모할 수 있고, 앞선 실행이 끝난 자리에 다음 실행을 투입하면 조건별 경쟁 상황도 달라집니다.

다음 운영 조건이라면 시간 절약을 위해 병렬 실행을 수용할 수 있습니다.

- 본 실험의 한 묶음은 여섯 조합을 포함하되, **모델별로 `A`·`BI`·`CI` 세 개를 함께 시작하는 두 차례 실행**으로 나눕니다.
- 세 실행이 모두 끝난 뒤 다음 차례를 시작합니다. 빈자리에 다음 표본을 즉시 투입하지 않습니다.
- 묶음마다 모델 실행 순서를 무작위화하고, 다섯 묶음 전체에서는 선행 횟수를 2회·3회로 균형 있게 배치합니다. 세 조건의 실행 슬롯도 무작위화합니다.
- 작업 디렉터리·대화·메모리·검사 출력은 실행별로 격리합니다. 공유하는 것은 실행 서비스뿐이어야 합니다.
- 호출 제한 응답, 재시도, 대기 시간, 실제 시작·종료 시각, 토큰·캐시 사용량을 기록합니다.
- 파일럿에서 공유 한도 때문에 중단되거나 실질적인 대기가 발생하면 병렬도와 한도를 조정한 뒤 다시 확인합니다. **본 실험 도중 조건별로 병렬도를 바꾸지 않습니다.**
- 본 실험 중 한도·시간 소진은 결과에 포함합니다. 서비스 장애의 재실행 기준은 사전에 고정합니다.

따라서 **3개 병렬은 수용, 3~6개 가변 병렬과 6개 병렬은 이번 설계에서 제외**하는 판정입니다. 병렬 간섭이 전혀 없다고 주장하지 않고, 동시 실행 정책까지 포함한 환경에서의 조건 차이로 해석합니다.

**2. 공개 계약 추가안**

기존 식별자·수량·반환 형식·여덟 명령은 유지합니다. 보관 등급은 다음 세 값의 **명목적 구분**이며, 차갑다는 이유로 다른 등급을 대체하지 않습니다.

```ts
export type StorageGrade = "AMBIENT" | "CHILLED" | "FROZEN";

/** 0 이상 Number.MAX_SAFE_INTEGER 이하의 안전한 정수 */
export type Tick = number;

export type ReservationStatus =
  | "ACTIVE"
  | "CANCELED"
  | "CONSUMED"
  | "EXPIRED";

export type TransitStatus =
  | "ACTIVE"
  | "ARRIVED"
  | "CANCELED";

export interface TransitView {
  transitId: ID;
  sampleId: ID;
  sourceContainerId: ID;
  targetContainerId: ID;
  status: TransitStatus;
}
```

기존 선언에는 다음 필드를 추가합니다. `SampleStatus`는 그대로 두고 격리와 운송을 별도로 표현합니다.

| 선언 | 추가 필드 | 계약 |
|---|---|---|
| `SampleView` | `storageGrade: StorageGrade` | 요구 보관 등급 |
| `SampleView` | `quarantined: boolean` | 생애 상태와 독립적인 격리 여부 |
| `ReservationView` | `expiresAt: Tick \| null` | 절대 만료 시각. `null`은 기한 없음 |
| `Catalog.containers`의 원소 | `supportedGrades: StorageGrade[]` | 지원하는 보관 등급 목록 |
| `Snapshot` | `now: Tick` | 현재 논리 시각 |
| `Snapshot` | `transits: TransitView[]` | 종료된 운송까지 포함한 운송 기록 |

시료에 `transitId`를 중복 저장하는 공개 필드는 두지 않습니다. 해당 시료의 `ACTIVE` 운송으로 판별할 수 있습니다. 목적 용기의 확보 상태도 공개 자료구조를 하나 더 만들지 않고 `transits`로 관찰할 수 있습니다.

기존 `ErrorCode` 유니온에는 다음 다섯 값을 추가합니다.

```ts
| "QUARANTINED"
| "STORAGE_INCOMPATIBLE"
| "IN_TRANSIT"
| "UNKNOWN_TRANSIT"
| "TRANSIT_CLOSED"
```

| 오류 | 의미 |
|---|---|
| `QUARANTINED` | 격리로 금지된 분취·예약·소비 |
| `STORAGE_INCOMPATIBLE` | 시료 등급을 지원하지 않는 목적 용기 |
| `IN_TRANSIT` | 운송 중 금지된 명령 또는 추가 운송 시작 |
| `UNKNOWN_TRANSIT` | 존재하지 않는 운송 식별자 |
| `TRANSIT_CLOSED` | 종료된 운송에 새로운 이벤트로 도착 확정·취소 |

그 밖에는 기존 오류를 재사용합니다. 잘못된 시각·등급 입력은 `INVALID_INPUT`, 재사용한 운송 식별자는 `ID_TAKEN`, 다른 운송이 확보한 용기는 `CONTAINER_OCCUPIED`입니다.

`Lab`에서는 아래 두 기존 메서드를 변경하고 여섯 메서드를 추가합니다. 나머지 기존 시그니처는 유지합니다.

```ts
receive(
  eventId: ID,
  input: {
    sampleId: ID;
    containerId: ID;
    custodianId: ID;
    qty: Qty;
    storageGrade: StorageGrade;
  }
): Result<Receipt>;

reserve(
  eventId: ID,
  input: {
    reservationId: ID;
    sampleId: ID;
    qty: Qty;
    expiresAt: Tick | null;
  }
): Result<Receipt>;

quarantine(eventId: ID, sampleId: ID): Result<Receipt>;
release(eventId: ID, sampleId: ID): Result<Receipt>;

advanceTime(eventId: ID, to: Tick): Result<Receipt>;

startTransit(
  eventId: ID,
  input: {
    transitId: ID;
    sampleId: ID;
    targetContainerId: ID;
  }
): Result<Receipt>;

confirmArrival(eventId: ID, transitId: ID): Result<Receipt>;
cancelTransit(eventId: ID, transitId: ID): Result<Receipt>;
```

`advanceTime`은 증가량이 아니라 **절대 시각**을 받습니다. `to >= now`를 허용하고 과거 시각은 거절합니다. 예약 생성 시 `expiresAt`은 `null`이거나 `now`보다 커야 합니다.

`EventView.op`에는 여섯 명령을 추가하고, `args` 모양도 공개 계약에 적습니다.

| 명령 | `args` |
|---|---|
| `quarantine`, `release` | `{ sampleId }` |
| `advanceTime` | `{ to }` |
| `startTransit` | 전달받은 `input` |
| `confirmArrival`, `cancelTransit` | `{ transitId }` |

새 명령에도 기존 재전송·원자성·이력 계약을 그대로 적용합니다. 동일 상태로 만드는 `quarantine`·`release`나 같은 시각의 `advanceTime`도 **새 이벤트라면 성공한 명령 하나**입니다. 예약 여러 개가 만료되어도 `advanceTime`의 이벤트는 하나이며, 만료별 이벤트를 추가하지 않습니다.

오류 우선순위는 늘리지 않습니다. **성공한 이벤트의 재전송 판정을 가장 먼저 한다는 기존 규칙만 유지**하고, 그 밖의 다중 위반은 해당 오류 중 하나를 허용합니다. 숨겨진 검사도 이 계약에 맞춰야 합니다.

추가 입력 필드는 필수로 두는 편이 명확합니다. 기존 회귀 입력에는 `storageGrade: "AMBIENT"`, `supportedGrades: ["AMBIENT"]`, `expiresAt: null`을 기계적으로 추가하되, 기존 기대 동작과 판정은 바꾸지 않습니다.

**3. 규칙 배치표**

총 **24개: 명시 10개·누락 9개·결합 5개**입니다. 누락 규칙은 네 규칙군에 각각 2개·3개·2개·2개로 분산했습니다.

여기서 ‘요청 포함’은 **해당 정책 문장 자체가 요청에 있는지**를 뜻합니다. 기능 이름이나 “문서를 따르라”는 문장이 있다는 이유로 포함 처리하지 않습니다. 결합 규칙은 구성 정책의 원출처를 모두 연결하되, 결합 사례 자체는 요청에 적지 않습니다.

| ID | 규칙 문장 | 원출처 위치 | 요청 포함 여부 | 분류 |
|---|---|---|---|---|
| `R9.1` | `quarantine`·`release`는 `ACTIVE` 시료의 격리 여부만 설정하며, 이미 같은 값이어도 성공한다. | `request` | 예 | 명시 |
| `R9.2` | 격리된 시료의 분취·신규 예약·예약 소비는 `QUARANTINED`로 거절한다. | `request` | 예 | 명시 |
| `R9.3` | 격리와 해제는 기존 예약의 상태·수량·만료 시각을 변경하지 않으며, 예약이 있어도 격리할 수 있다. | `docs/quality.md` | 아니오 | 누락 |
| `R9.4` | 예약 취소·이동·폐기·책임자 변경·운송 절차는 격리만을 이유로 거절하지 않으며, 각각의 다른 제한은 적용한다. | `docs/quality.md` | 아니오 | 누락 |
| `R9.5` | 격리 중 예약을 취소하면 예약량만 해제되고 격리와 실제 남은 양은 유지된다. | `docs/quality.md` + `docs/reservations.md` | 아니오 | 결합 |
| `R10.1` | 입고 시 요구 보관 등급을 지정하고, 용기에는 지원 등급 목록을 둔다. | `request` + `types` | 예 | 명시 |
| `R10.2` | 입고·분취·이동의 목적 용기가 요구 등급에 부적합하면 `STORAGE_INCOMPATIBLE`로 거절한다. | `request` | 예 | 명시 |
| `R10.3` | 적합성은 지원 목록에 요구 등급이 정확히 포함되는지로 판단하며, 등급 사이 대체·상하 관계는 없다. | `docs/storage.md` | 아니오 | 누락 |
| `R10.4` | 분취 자식의 요구 보관 등급은 부모의 등급을 상속하며, 호출자가 따로 지정하지 않는다. | `src` 주석 `src/lab/samples.ts` | 아니오 | 누락 |
| `R10.5` | 생성된 시료의 요구 보관 등급은 이후 명령으로 변경되지 않는다. | `docs/storage.md` | 아니오 | 누락 |
| `R10.6` | 부적합한 목적지로 운송을 시작하면 실패하며, 운송 기록·목적 용기 확보·기존 상태가 생기거나 바뀌지 않는다. | `docs/storage.md` + `docs/transit.md` + `docs/engine.md` | 아니오 | 결합 |
| `R11.1` | 논리 시각은 0에서 시작하고, `advanceTime`은 유효한 절대 시각으로만 진행하며 같은 시각은 허용하고 역행은 거절한다. | `request` + `types` | 예 | 명시 |
| `R11.2` | 신규 예약의 만료 시각은 기한 없음 또는 현재보다 미래인 유효 시각이어야 하며, 위반하면 `INVALID_INPUT`이다. | `request` + `types` | 예 | 명시 |
| `R11.3` | 시각 진행으로 만료 대상이 된 활성 예약은 종료되고 예약량을 해제하되, 실제 남은 양·소비량·폐기량은 바꾸지 않는다. | `request` | 예 | 명시 |
| `R11.4` | `expiresAt <= now`인 활성 예약은 모두 `EXPIRED`가 되므로, 만료 시각과 정확히 같아지는 순간에도 만료된다. | `docs/reservations.md` | 아니오 | 누락 |
| `R11.5` | 만료 예약에 새로운 이벤트로 취소·소비를 요청하면 `RESERVATION_CLOSED`이며, 만료 기록은 보존한다. | `docs/reservations.md` | 아니오 | 누락 |
| `R11.6` | 격리 또는 운송 중인 시료의 예약도 정상적으로 만료되며, 그 과정에서 격리·현재 용기·운송 목적 확보는 바뀌지 않는다. | `docs/reservations.md` + `docs/quality.md` + `docs/transit.md` | 아니오 | 결합 |
| `R12.1` | `ACTIVE` 시료에 고유한 운송 식별자로 운송을 시작하고, 도착 확정·운송 취소 명령으로 종료한다. | `request` + `types` | 예 | 명시 |
| `R12.2` | 도착 확정은 시료를 목적 용기로 옮기고 운송을 `ARRIVED`로 만들며, 취소는 출발 용기에 둔 채 `CANCELED`로 만들고 목적 확보를 푼다. | `request` | 예 | 명시 |
| `R12.3` | 운송 중에는 분취·소비·폐기·직접 이동·추가 운송 시작을 `IN_TRANSIT`으로 거절한다. | `request` | 예 | 명시 |
| `R12.4` | 운송 시작부터 종료까지 출발 용기의 실제 점유와 목적 용기의 배타적 확보를 함께 유지하며, 확보된 목적지는 입고·분취·이동·다른 운송의 목적지로 쓸 수 없다. | `docs/transit.md` + `src` 주석 `src/lab/storage.ts` | 아니오 | 누락 |
| `R12.5` | 종료 운송은 기록과 식별자를 보존한다. 식별자 재사용은 `ID_TAKEN`, 없는 운송 조작은 `UNKNOWN_TRANSIT`, 종료 운송의 새 도착·취소는 `TRANSIT_CLOSED`다. | `docs/transit.md` | 아니오 | 누락 |
| `R12.6` | 도착 확정이나 취소가 끝난 뒤 같은 성공 이벤트를 재전송하면 최초 영수증을 반환하며, 종료 오류나 추가 이동·이력을 만들지 않는다. | `docs/engine.md` + `docs/transit.md` | 아니오 | 결합 |
| `R12.7` | 운송 중 금지된 폐기·소비가 실패하면 시료·예약·양쪽 용기 상태·운송·이력이 모두 유지되고, 실패 이벤트 식별자도 소모하지 않는다. | `docs/transit.md` + `docs/engine.md` | 아니오 | 결합 |

운송 정책의 빈틈을 막기 위해 `docs/transit.md`에는 허용 명령도 명시해야 합니다. **운송 중 신규 예약·예약 취소·책임자 변경·격리·해제·시각 진행은 허용**하되, 격리나 수량 등 다른 계약은 그대로 적용합니다. 도착과 취소는 시료의 수량·계보·책임자·보관 등급·격리 여부를 바꾸지 않습니다. 이는 `R12.2`·`R12.3`의 정책 설명이며, 별도의 미등록 채점 규칙으로 만들지 않습니다.

보관 문서의 적용 범위에는 운송 목적지도 포함한다고 명시합니다. `R10.6`은 숨겨진 운송 정책을 새로 요구하는 것이 아니라, **보관 적합성·운송 확보·실패 원자성을 결합한 검사**여야 합니다.

주지표 계산은 다음처럼 고정하면 됩니다.

```text
누락 규칙 점수 = 해당 규칙의 숨겨진 검사 통과 수 / 예정 검사 수
규칙군 점수 = 해당 규칙군에 속한 누락 규칙 점수의 평균
주지표 = 네 규칙군 점수의 평균
```

결합 5개는 누락 9개와 별도 집계합니다. 같은 검사를 두 그룹에 중복 산입하지 않고, 결합 규칙은 별도의 연산열로 검사합니다.

**4. 시작 저장소의 문서·코드 구조**

문서는 다음 다섯 개면 충분합니다.

| 파일 | 책임 |
|---|---|
| `docs/engine.md` | 기존 `R1~R8`의 공통 계약: 식별자·수량·계보·종료 상태·재전송·원자성·이력·다중 오류 처리. 새 명령에도 적용된다는 범위 명시 |
| `docs/quality.md` | 격리 상태, 차단·허용 명령표, 기존 예약 보존 |
| `docs/storage.md` | 등급의 의미와 정확 일치 판정, 보관 등급 불변성, 운송 목적지를 포함한 적용 범위 |
| `docs/reservations.md` | 기존 예약·소비·취소와 논리 시각·만료 경계·종료 예약 |
| `docs/transit.md` | 운송 전이, 출발 점유·목적 확보, 허용·금지 명령, 종료 기록 |

문서마다 책임 범위의 정책을 직접 적고, 다른 문서의 정책은 링크로 연결합니다. 상속 정책의 원출처는 `samples.ts` 주석으로 유지하되, 문서에서는 해당 위치를 안내할 수 있습니다.

[기존 `lab.ts`](/Users/chan/Documents/develop/harness-lab/experiments/ontology/reference/lab.ts)는 다음처럼 분할하는 안을 권합니다.

| 모듈 | 기존 구현에서 옮길 부분·신규 책임 |
|---|---|
| `src/lab/types.ts` | 확장된 공개 계약 |
| `src/lab/lab.ts` | `createLab`, 카탈로그 초기화, 명령 조립과 공개 진입점 |
| `src/lab/state.ts` | `State`, 초기 상태, 작업 복사본, 종료 처리·활성 시료 조회 |
| `src/lab/events.ts` | `canon`, `run`, 재전송 판정, 성공 영수증·이력·커밋 |
| `src/lab/storage.ts` | 용기 존재·점유·용량 검사와 점유 변경. 신규 등급 검사·운송 확보 판정의 연결점 |
| `src/lab/samples.ts` | `receive`, `split`, `discard`, `move`, `transferCustody` |
| `src/lab/reservations.ts` | `reserve`, `cancel`, `consume`; 신규 `advanceTime`과 만료 처리 |
| `src/lab/quality.ts` | 신규 `quarantine`, `release` |
| `src/lab/transit.ts` | 신규 `startTransit`, `confirmArrival`, `cancelTransit` |

핵심은 **여섯 새 명령도 같은 `run`을 거치게 하는 것**입니다. 현재 구현의 작업 복사본에 `now`·운송·확보 상태가 추가되면, 그 상태까지 복사와 커밋의 범위에 넣어야 합니다. 별도의 운송용 이벤트 처리기를 만들면 재전송과 원자성의 규칙이 갈라집니다.

시작 코드 제작은 두 단계로 검증하는 편이 명확합니다.

1. 기존 계약으로 `lab.ts`를 분할하고, `R1~R8` 회귀를 통과시켜 분할 자체가 동작을 바꾸지 않았음을 확인합니다.
2. 확장 공개 계약과 정책 주석을 배치합니다. 신규 필드·메서드 연결의 미완성 부분은 과제로 남기고, 그 사실을 공통 요청에 명시합니다.

**누락 규칙의 구현을 시작 코드에 미리 넣으면 안 됩니다.** 예를 들어 보관 등급 상속은 주석에 정책만 제공하고, 올바른 상속 구현을 함께 제공하지 않습니다. 확장 계약 때문에 생기는 미구현 부분과 기존 회귀 결함을 구분해 관리해야 합니다.

**5. `task.md`에 넣을 문장 범위**

요청에는 다음만 둡니다.

- 기존 엔진 확장이라는 목표와 변경 범위.
- 공개 진입점·수정 금지인 공개 계약·실행 환경.
- 위 표의 명시 규칙 10개.
- 다섯 문서와 관련 주석을 중립적으로 안내하는 계약 준수 문장.
- 기존 기능 보존과 공통 검증 방법.

누락 규칙 9개, 결합 사례 5개, 누락 규칙의 검사 예시는 요청에서 제외합니다. 요청에는 상세 예외 목록이나 “특히 이 경계를 확인하라”는 힌트를 추가하지 않습니다.

다음 문안을 공통 요청의 골격으로 사용할 수 있습니다.

> 제공된 시료 보관 엔진의 기존 기능을 유지하면서 격리, 보관 적합성, 예약 만료, 운송 기능을 추가해 주세요. 시작 구현은 기존 기능의 기준 구현을 분할한 것이며, 확장된 공개 계약의 신규 필드와 메서드 연결은 미완성입니다.
>
> 공개 진입점은 `src/lab/lab.ts`의 `createLab(catalog: Catalog): Lab`입니다. `src/lab/types.ts`는 수정하지 말고, 필요한 구현은 `src/lab/` 안에서 변경해 주세요. 엔진은 메모리에서 호출을 하나씩 처리하며 실제 시계·외부 저장소·동시 호출은 다루지 않습니다.
>
> `quarantine`과 `release`는 활성 시료의 격리 여부를 설정합니다. 이미 요청한 상태여도 성공합니다. 격리된 시료의 분취·신규 예약·예약 소비는 거절해야 합니다.
>
> 입고 시 시료의 요구 보관 등급을 지정하고, 용기별 지원 등급을 사용해 입고·분취·이동의 보관 적합성을 검사해 주세요.
>
> 논리 시각은 0에서 시작합니다. `advanceTime`은 현재 이상인 유효한 절대 시각을 받습니다. 예약은 기한이 없거나 현재보다 미래인 만료 시각을 가지며, 시각 진행에 따라 만료된 예약의 예약량을 해제해야 합니다. 만료는 실제 남은 양·소비량·폐기량을 바꾸지 않습니다.
>
> `startTransit`은 활성 시료의 운송을 고유한 식별자로 시작합니다. `confirmArrival`은 목적 용기로 이동시켜 운송을 완료하고, `cancelTransit`은 출발 용기에 둔 채 운송을 취소하고 목적 용기 확보를 해제합니다. 운송 중에는 분취·소비·폐기·직접 이동·추가 운송 시작을 거절해야 합니다.
>
> **이 요청은 구현 범위를 요약한 것이며 전체 정책 목록이 아닙니다. 기존 문서와 코드 계약을 따르세요. 적용할 계약은 `src/lab/types.ts`, `docs/`의 다섯 정책 문서, 관련 구현 모듈의 정책 주석에 있습니다. 기존 재전송·원자성·이력 규칙은 새 명령에도 적용됩니다. 저장소에 명시되지 않은 실제 연구실 관행은 추가하지 마세요.**

명시 규칙의 오류 코드까지 요청에 포함하려면 위 표의 해당 행과 함께 옮기면 됩니다. 어느 방식을 택하든 **최종 `task.md`를 기준으로 요청 포함 여부를 다시 판정**해야 합니다. 참가자의 추가 질문에는 다음 공통 문구로 답하면 됩니다.

> 요청은 기능 범위를 요약합니다. 저장소의 정책 문서·관련 코드 주석·공개 타입 계약을 확인하고 구현해 주세요. 추가 정책은 제공하지 않습니다.

**최종 합의안은 다음과 같습니다.** 0037 기준 구현을 책임별 모듈로 나누고, 모든 조건에 동일한 확장 공개 계약과 다섯 정책 문서를 제공합니다. R9~R12는 명시 10개·누락 9개·결합 5개로 고정하며, 온톨로지는 공통 원출처의 재구성만 허용합니다. 파일럿 12회로 과제·검사·한도·병렬 운영을 확인한 뒤 동결하고, 본 실험 30회는 같은 모델의 세 조건을 고정 3개 병렬로 실행합니다. 주지표는 규칙별 점수에서 규칙군별 동일 가중으로 계산한 요청 누락 규칙 준수율이며, 결합·회귀·탐색 증거·비용은 별도로 보고합니다. 결론은 `BI−A`를 탐색 부담 감소·정리·직접 노출의 결합 효과로, `CI−BI`를 형식·검사·완료 강제의 결합 효과로 제한합니다.