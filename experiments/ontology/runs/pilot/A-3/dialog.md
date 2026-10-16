## AI

**작업 0040 완료됨 ✅**

연구실 시료 보관 엔진을 AGENTS.md 규칙에 따라 완성했습니다.

## 결과물

**문서:**
- `prd.md`: 요구사항, R1~R8 규칙 요약, Acceptance 조건 (4개)
- `sdd.md`: 데이터 구조(Map 기반), 원자성·멱등성 구현 전략
- `trace.md`: 8단계 진행 기록 (완료)

**코드:**
- `src/lab/lab.ts` (590행): `createLab` 팩토리로 8개 메서드 구현
  - `receive`: 시료 수신 (루트 계보 생성)
  - `split`: 시료 분취 (부모·자식 계보, 원자성)
  - `reserve`/`cancel`/`consume`: 예약 관리 (이용 가능량 개념)
  - `discard`: 폐기 (상태 전이)
  - `move`: 용기 이동
  - `transferCustody`: 책임자 변경

**테스트:**
- `src/lab/lab.test.ts` (443행): R1~R8 규칙별 + 종합 시나리오 168개 ALL PASS

## 검증 통과
```
✅ Typecheck (tsc --noEmit)
✅ Unit tests (vitest run) — 168 tests
✅ No npm/yarn lockfiles
✅ Task records (prd·sdd·trace·TASKS)
```

## 핵심 구현 상세
- **R7 멱등성**: `deepEqual` 함수로 객체 키 순서 무시, 배열 순서 구별 비교
- **R8 원자성**: split 중 일부 실패 시 전체 롤백 (userContainers Set)
- **예약 시스템**: "이용 가능량" = remaining - reserved로 사전 할당 지원
- **계보 추적**: parentId, rootId로 다단계 분취 지원 (다단계 split 테스트 통과)
- **상태 관리**: ACTIVE/DEPLETED/DISCARDED로 종료 상태 처리, 끝난 시료는 containerId null

2개 커밋 완료 (`task/0040-lab` 브랜치).
