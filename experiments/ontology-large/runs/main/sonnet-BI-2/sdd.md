# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, ontology.md, docs/engine·quality·storage·reservations·transit.md, src/lab/*.ts
- **접근:** 모든 명령은 기존 `Engine.run`(재전송·작업 복사본·이력)을 그대로 쓰고 모듈별 `body`만 채운다. 운송 목적 용기 확보는 `s.occupied`에 목적 용기→시료로 올려 `Storage.isFree` 하나로 모든 경로가 막히게 한다(도착 시 출발 키 삭제, 취소 시 목적 키 삭제). `state.ts`에 `inTransit(s, sampleId)` 헬퍼를 추가한다.
- **대안·트레이드오프:** 확보 맵을 따로 두면 isFree 외 경로마다 검사가 늘어 누락 위험 → 기각.
- **파일 계획:** quality.ts, reservations.ts, samples.ts, transit.ts, state.ts, storage.ts(주석), 테스트 `src/lab/lab.test.ts`.
- **위험:** 실패 시 부분 변경(작업 복사본이 보장), 재전송 우선(run이 보장).
- **검증 계획:** vitest로 명령별·재전송·원자성·이력·불변식 테스트, `pnpm check`.

## 계획과 달라진 점
없음 (테스트 코드만 타입 엄격 설정에 맞춰 `?.`로 고침)

## 검증 결과
- `pnpm check` ALL PASS — 테스트 143개(신규 `src/lab/lab.test.ts` 15개), 타입체크 통과.
- 직접 확인한 경계: 만료 시각 = now(포함 만료)·expiresAt ≤ now 예약 거절, 과거·비정수 시각, 운송 중 5개 명령 거절 뒤 스냅숏 동일, 재전송이 이벤트를 늘리지 않음.
