## AI

✅ **작업 0040 완료됨** — 시료 보관 엔진 구현 완료

## 완료 사항

### ✅ 구현 (src/lab/lab.ts)
- `createLab(catalog: Catalog): Lab` 함수 구현
- **8개 명령**: receive, split, reserve, cancel, consume, discard, move, transferCustody
- **규칙 준수**: R1~R8 (참조·계보·예약·상태·용기·책임·재전송·원자성)
- **불변식 보장**: I1~I11 (수량 보존, 계보 일관성, 예약 추적 등)
- **핵심 기능**:
  - 이벤트 중복 재전송(R7): 같은 eventId + 같은 인자 → 처음 Receipt 반환
  - 원자성(R8): 실패 시 모든 상태 무변화, split도 전부 또는 전무
  - 나머지 양과 예약의 구별: available = remaining − reserved

### ✅ 문서 (agents/intent/specs/0040-lab/)
- **PRD**: 요구사항, 완료 조건, 규칙 요약
- **SDD**: 접근·대안·검증 계획, 아키텍처, 명령별 구현, 불변식 검증
- **Trace**: 작업 일지, 작업 기록표

### ✅ 검증 (pnpm check)
- **Typecheck** ✅: TypeScript 타입 검사 통과
- **Unit tests** ✅: 128개 테스트 통과
- **Task records** ✅: PRD·SDD·Trace·TASKS 형식 검증

## 주요 설계 결정

1. **상태 유지 vs 계산**: reserved는 유지 (O(1) available 계산)
2. **재전송 위치**: 모든 명령의 가장 먼저 체크 (R7 명시)
3. **args 복사**: recordEvent에서 copyObject 호출 (I11 독립성)

커밋: `df005d9` — `[0040] 작업 완료 기록`
