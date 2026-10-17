# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD

- **이슈:** #1
- **브랜치:** task/0040-lab

## 요구사항 요약

기존 시료 보관 엔진(`src/lab/`)의 기능을 유지하면서 네 가지 기능을 추가합니다:
1. **격리(Quarantine)**: 품질 확인 중 시료 사용 금지
2. **보관 등급 적합성(Storage Grade Compatibility)**: 용기의 보관 조건 검사
3. **예약 만료(Reservation Expiration)**: 시간 경과에 따른 예약 자동 종료
4. **운송(Transit)**: 시료의 2단계 이동 절차

## Acceptance

- [ ] 격리: `quarantine`·`release` 구현, 격리된 시료 분취/예약/소비 거절
- [ ] 보관 등급: 받기·분취·이동의 목적 용기 검사 연결
- [ ] 예약 만료: `advanceTime` 구현, 예약 자동 EXPIRED 전환
- [ ] 운송: `startTransit`·`confirmArrival`·`cancelTransit` 구현, 운송 중 제약 적용
- [ ] `pnpm check` PASS

## 완료 조건

### 기능 요구사항
- **격리**: `quarantine`·`release` 구현, 격리된 시료의 분취·새 예약·소비 거절
- **보관 등급**: 받기·분취·이동의 목적 용기가 요구 등급 지원 확인
- **예약 만료**: `advanceTime` 구현, 만료된 ACTIVE 예약 자동 `EXPIRED`로 전환
- **운송**: `startTransit`·`confirmArrival`·`cancelTransit` 구현, 운송 중 명령 제약

### 정책 준수
- 모든 기능은 `docs/` 정책 문서(`engine.md`, `storage.md`, `quality.md`, `reservations.md`, `transit.md`)를 따름
- 기존 재전송(E5)·원자성(E6)·이력 규칙 유지
- ontology.json의 불변식(I1-I14) 모두 만족

### 테스트 커버리지
- 각 기능별 정상·오류 경로 테스트
- 기능 간 상호작용 테스트 (격리+운송, 격리+예약 만료, 등급+이동 등)
- 원자성 검증 (실패 시 상태 변경 없음)

### 구현 제약
- `src/lab/types.ts` 수정 금지
- 메모리 내 한 번에 한 호출씩 처리
- 실제 시계·외부 저장소·동시 호출 미지원

## 구현 범위

### 문서 검토 필요 항목
- `docs/quality.md` — 격리와 예약의 상호작용
- `docs/storage.md` — 등급 적합성 판정 규칙
- `docs/reservations.md` — 만료 시각 판정 (expiresAt ≤ now)
- `docs/transit.md` — 2단계 절차, 점유·확보 규칙
- `docs/engine.md` — E5(재전송), E6(원자성·이력)

### 구현 모듈 변경
1. `src/lab/quality.ts` — `quarantine`·`release` 전체 구현
2. `src/lab/reservations.ts` — `advanceTime` 전체 구현, `reserve`·`consume` 격리 검사 추가
3. `src/lab/samples.ts` — 보관 등급 검사 추가, split 시 등급 상속
4. `src/lab/transit.ts` — `startTransit`·`confirmArrival`·`cancelTransit` 전체 구현
5. `src/lab/state.ts` — reserved 필드 확인, transit 추적

### 테스트 파일
- `src/lab/__tests__/` 에 기능별 테스트 추가 (기존 테스트 구조 따름)

## 애매한 곳·가정

- 없음 — 모든 설계 사항은 정책 문서(engine.md, storage.md, quality.md, reservations.md, transit.md) 및 ontology.json에서 확인됨
