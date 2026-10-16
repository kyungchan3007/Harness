# 0040 — 연구실 시료 보관 엔진 — PRD

- **이슈:** #1

## 요구사항

메모리 내에서 연구실 시료(액체)의 수명 주기를 관리하는 엔진을 구현합니다.
- 입력: `Catalog`(장소·용기·책임자 목록) + 명령(receive, split, reserve, cancel, consume, discard, move, transferCustody)
- 출력: 각 명령의 성공/실패(`Result<Receipt>`) + 전체 스냅샷(`Snapshot`)

## 완료 조건

1. 8개 명령 모두 `types.ts` 규약에 따라 구현
2. 규칙 R1~R8 (요청 문서의 규칙)을 모두 만족
3. `pnpm check` 통과 (타입 검사, 테스트)
4. `src/lab/lab.ts`에서 `createLab(catalog: Catalog): Lab` 내보내기
5. `types.ts` 수정 금지

## Acceptance

- [x] 8개 명령 구현 (receive, split, reserve, cancel, consume, discard, move, transferCustody)
- [x] R1~R8 규칙 만족
- [x] pnpm check 통과

## 애매한 곳·가정

- args 비교 시 객체 키 순서 무시 — JSON 직렬화 후 비교로 구현 (가정)
- 실패한 eventId는 기록 안 됨 — eventIdToSeq에 저장하지 않음 (가정)
- 여러 규칙을 어기는 경우 어느 오류 코드든 반환 가능 — 먼저 만난 오류 반환 (가정)

## 진행 경로

1. ~~PRD 작성~~ (완료)
2. ~~SDD 작성~~ (완료)
3. 코드 구현 (`src/lab/lab.ts`)
4. trace.md 업데이트
5. 게이트 통과 (`pnpm check`)
