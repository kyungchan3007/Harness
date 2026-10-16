## AI

## 완료

**0040 — 연구실 시료 보관 엔진** 구현 완료. 

### 성과

✅ **구현**: `src/lab/lab.ts`에 `createLab()` + 8개 명령 (receive, split, reserve, cancel, consume, discard, move, transferCustody)

✅ **규칙 준수**: R1~R8의 모든 규칙 + I1~I11 불변식
- **R7 하이라이트**: 같은 eventId로 재전송된 명령은 첫 Receipt를 돌려주고 상태 불변
- **R8 원자성**: split 실패 시 모든 변경 롤백 (검사를 수정 전에 완료해서 구현)

✅ **테스트**: 공개 예시 4개 + 규칙별 36개 = 40개 테스트 (`pnpm check` 170/170 통과)

✅ **문서**: PRD·SDD·trace.md 작성, JOURNAL.md 생성

### 기술 선택
- **eventId 재전송 체크를 입력 검증보다 먼저**: R7을 구현하는 가장 자연스러운 위치
- **분취 원자성**: 메모리 수정 전에 모든 자식 검사 완료 (롤백 코드 불필요)
- **args 복사**: JSON 직렬화로 나중 수정도 이력에 영향 없음 (R8-3)

### 커밋
`[0040] 연구실 시료 보관 엔진: createLab + 8개 명령 구현` — 허점/보완 없음, 토큰 사용량 기록
