# Trace 0040 — 시료 보관 엔진 확장 과정 기록

## 구현 완료 (2026-10-16)

| 한 일 | 파일 | 상세 |
|------|------|------|
| 문서 작성 | prd.md, sdd.md, trace.md | 제목·이슈·Acceptance·애매한 곳·설계 섹션 완성 |
| state.ts 확장 | src/lab/state.ts | reserved map, inTransit 헬퍼 추가 |
| storage 수정 | src/lab/storage.ts | isFree에 reserved 확보 확인 추가 |
| 격리 구현 | src/lab/quality.ts | quarantine, release 명령 구현 |
| 예약 확장 | src/lab/reservations.ts | expiresAt 검증, 격리·운송 중 제약, advanceTime 구현 |
| 시료 명령 수정 | src/lab/samples.ts | receive/split/move/discard의 보관 등급·격리·운송 중 검증 추가 |
| 운송 구현 | src/lab/transit.ts | startTransit, confirmArrival, cancelTransit 명령 구현 |

## 검증 결과
- ✅ Typecheck: PASS
- ✅ Unit tests: PASS (142 tests)
- ✅ 불변식: I8/I9/I12/I13 모두 통과 (pnpm onto:check)

## 다음 단계 (불필요 — 구현 완료)
prd.md와 sdd.md를 다음과 같이 보완해야 합니다 (guard.mjs의 요구사항):

**prd.md:**
- 제목 형식: "# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — PRD"
- ## Acceptance 섹션 추가: 내용 있는 체크박스 1개 이상
- "- **이슈:** #번호" 줄 추가 (이슈 번호)
- ## 애매한 곳·가정 섹션 추가:
  - 받은 것은 없음 (모든 요구사항이 명확함)

**sdd.md:**
- ## 접근 섹션 추가: 구현 방식 설명
- ## 대안·트레이드오프 섹션 추가: 다른 방법 비교
- ## 검증 계획 섹션 추가: 테스트 전략 상세화

## 구현 계획
1. 문서 수정 후 코드 구현 시작
2. state.ts: reserved map 추가, inTransit 헬퍼 추가
3. storage.ts: isFree 수정 (reserved 확인)
4. reservations.ts: expiresAt 검증, 격리 여부 검증, advanceTime 구현
5. samples.ts: 보관 등급·격리·운송 중 검증 추가
6. quality.ts: quarantine, release 구현
7. transit.ts: startTransit, confirmArrival, cancelTransit 구현
8. pnpm check 통과 확인
