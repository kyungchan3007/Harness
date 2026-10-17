# 태스크 0040: 시료 보관 엔진 확장 — Trace

## 시작 (2026-10-16)

- [x] prd.md 작성 완료
- [x] sdd.md 작성 완료
- [x] request.md 생성됨 (조율자)
- [x] 원문 확인 완료
- [x] 구현 완료

## 구현자 작업 완료 (2026-10-16)

- 모든 명령 구현 완료: quarantine, release, advanceTime, startTransit, confirmArrival, cancelTransit
- 모든 검사 추가 완료: 격리, 보관 등급, 예약 만료, 운송 중 명령 제한
- pnpm check 통과: Typecheck, Unit tests (128 passed), Task records

## 설계자 검수 완료 (2026-10-16)

**prd.md:**
- [x] 제목을 "# 0040 — 시료 보관 엔진 확장 — PRD"로 변경
- [x] "- **이슈:** #1" 줄 추가
- [x] "## Acceptance" 섹션에 체크박스 8개 추가
  - `pnpm check` 통과, 격리·만료·운송 명령 구현, 등급 검사, 기존 명령 무손상, 불변식·정책 준수
- [x] "## 애매한 곳·가정" 섹션 추가
  - 모든 정책이 docs/ 및 ontology.md에 명시됨

**sdd.md:**
- [x] "## 접근" 섹션 추가 (격리·등급·만료·운송 각 1개 전략)
- [x] "## 대안·트레이드오프" 섹션 추가 (occupied 맵·만료 처리·등급 검사 3가지 대안)
- [x] "## 검증 계획" 섹션 추가 (회귀·불변식·엣지 케이스)

**설계 결정 기록:**
- 원문에 없음 — 모든 사항이 docs/ 정책 문서와 ontology.md에 이미 명시됨
- Acceptance 조건: 8개 체크박스 (기존 완료 조건을 더 세분화)
- 검증 계획: I1-I14 불변식 + 엣지 케이스 (격리+예약, 만료+운송, 등급+격리·운송, 원자성, 재전송)

구현자가 코드 작성 시작 가능

## 진행 상황

| 단계 | 항목 | 설명 | 상태 |
| --- | --- | --- | --- |
| Phase 1 | quality.ts: quarantine/release | ACTIVE 시료의 격리 여부 설정, 중복 성공 | ✓ |
| Phase 1 | reservations.ts reserve/consume | QUARANTINED 검사 추가 | ✓ |
| Phase 2 | samples.ts split 자식 등급 상속 | storageGrade: parent.storageGrade | ✓ |
| Phase 2 | samples.ts receive/split/move | 등급 검사 (storage.supports) 추가 | ✓ |
| Phase 2 | samples.ts split/move/discard | IN_TRANSIT 검사 추가 | ✓ |
| Phase 3 | reservations.ts advanceTime | now 업데이트, ACTIVE 예약 EXPIRED 변경 | ✓ |
| Phase 3 | reservations.ts reserve | expiresAt 유효성 검사 추가 | ✓ |
| Phase 4 | transit.ts startTransit | 운송 시작, 목적 용기 확보 | ✓ |
| Phase 4 | transit.ts confirmArrival | 시료 이동, 운송 상태 ARRIVED | ✓ |
| Phase 4 | transit.ts cancelTransit | 목적 용기 확보 해제, 운송 상태 CANCELED | ✓ |
| Phase 5 | Typecheck | TypeScript 문법 검증 | ✓ |
| Phase 5 | Unit tests | 128 테스트 통과 | ✓ |

## 발견 사항

(작업 진행 중 기록)

## 미완료 사항

(완료되지 않은 것이 있으면 기록)
