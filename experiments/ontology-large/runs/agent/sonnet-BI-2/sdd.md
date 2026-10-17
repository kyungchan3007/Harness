# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md) · 원문: [request.md](request.md)

## 설계
- **읽은 문서:** docs/engine.md·quality.md·storage.md·reservations.md·transit.md, agents/context/ontology.md, src/lab/* 정책 주석(samples.ts 상속, storage.ts 점유)
- **접근:** 모든 명령은 기존 `Engine.run`(재전송·작업 복사본·이력)을 거치게 해 E5·E6을 새 명령에도 자동 적용한다. 점유 판정은 `Storage.isFree` 한 곳에 모은다(출발 용기 `occupied` + ACTIVE 운송 목적지). 등급 적합성은 `Storage.supports`를 받기·분취·이동·운송에서 호출. 운송 중 판정은 `state.ts`의 `inTransit` 헬퍼 하나로 분취·소비·폐기·이동·추가 운송이 공유.
- **대안·트레이드오프:** 목적 용기를 `occupied`에 넣는 방법은 도착·취소 때 시료와 용기 매핑이 섞여 I2를 깨뜨리기 쉬워 채택하지 않음. `isFree`에서 transits를 훑는 방식은 O(운송 수)지만 단순하고 작업 복사본과 함께 원자적으로 롤백된다.
- **파일 계획:** state.ts(inTransit), storage.ts(isFree·grade), samples.ts(등급·IN_TRANSIT·QUARANTINED), reservations.ts(reserve 검증·QUARANTINED·consume·advanceTime), quality.ts, transit.ts, 테스트 `src/lab/lab.test.ts`.
- **위험:** 검사 순서가 오류 코드에 영향(허용됨, E6.4). 재전송 판정은 run이 가장 먼저 하므로 안전. 실패 시 부분 변경 없음은 작업 복사본으로 보장.
- **검증 계획:** 명령별 성공·거절 단위 테스트, 실패 뒤 스냅숏 불변, 재전송 멱등·EVENT_CONFLICT, 만료 경계(`expiresAt === now`), 운송 확보·취소 해제·끝난 운송 ID_TAKEN, 보존 불변식.

## 계획과 달라진 점
없음 — 계획대로 구현했다. 테스트에서 검사 순서와 무관하게 코드가 정해지도록 케이스를 한 규칙씩만 어기게 구성했다.

## 검증 결과
`pnpm check` ALL PASS. 단위 테스트 `src/lab/lab.test.ts` 19개(격리·등급·만료 경계·운송 확보/해제·IN_TRANSIT·재전송·원자성·수량 보존).
