# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, docs/engine.md·quality.md·storage.md·reservations.md·transit.md, architecture.md, src/lab/* 전부
- **접근:** 모든 명령은 기존 `Engine.run`을 거쳐 재전송(E5)·작업 복사본 원자성(E6)을 그대로 받는다. 새 명령은 모듈의 미구현 자리를 채운다. 운송 중 판정은 `state.ts`의 `inTransit(s, sampleId)`(ACTIVE 운송 존재 여부)로 한 곳에서 한다. 운송 목적 용기는 `occupied` 표에 시료 ID로 넣어 확보하므로 `Storage.isFree`가 받기·분취·이동·다른 운송 목적지를 한꺼번에 막는다. 도착은 출발 점유를 풀고 목적 점유를 유지, 취소는 목적 점유만 푼다. 보관 등급은 `Storage.supports`를 받기·분취·이동·운송 시작에 연결하고 분취 자식은 부모 등급을 물려받는다. 만료는 `advanceTime`에서 `expiresAt <= to`인 ACTIVE 예약을 `EXPIRED`로 바꾸며 시료의 reserved만 줄인다.
- **대안·트레이드오프:** 운송 확보를 별도 표로 두는 안은 isFree 외에 모든 호출 지점을 고쳐야 해서 버렸다. occupied 재사용은 `finish`가 containerId 하나만 풀기 때문에, 운송 중 시료가 끝날 수 없다는 제약(소비·폐기·분취 금지)에 기댄다.
- **파일 계획:** quality.ts, reservations.ts, samples.ts, transit.ts, state.ts, storage.ts(주석), src/lab/lab.test.ts
- **위험:** 검사 순서가 오류 코드를 바꿈 → 여러 규칙 위반 시 아무 코드나 허용(E6-4). 실패 시 어떤 상태도 바뀌지 않아야 함 → 검사를 모두 끝낸 뒤에만 변경.
- **검증 계획:** 명령별·정책별 단위 테스트(vitest), 재전송·원자성·이력 테스트, `pnpm check`.

## 계획과 달라진 점
없음

## 검증 결과
`pnpm check` 결과는 trace.md 마지막 행.
