## AI

완료했습니다! 연구실 시료 보관 엔진이 완전히 구현되었습니다.

## 요약

**✅ ALL PASS** — 모든 게이트 통과

### 구현 완료
- **src/lab/lab.ts**: Lab 인터페이스의 완전한 구현 (약 450줄)
  - 8개 명령: receive, split, reserve, cancel, consume, discard, move, transferCustody
  - R7 Idempotency: 같은 eventId 재전송 시 처음 Receipt 반환 (EVENT_CONFLICT 감지)
  - R8 Atomicity: split은 모든 자식 검증 후 원자적 생성
  - R1~R6 규칙: 용기·시료·예약·상태·이동·책임자 완벽하게 구현

### 테스트 완료
- **src/lab/lab.test.ts**: 36개 단위 테스트 + 통합 테스트
  - 규칙 R1~R8: 각 규칙당 1~2개 테스트
  - 불변식 I1: 계보 수량 보존 검증
  - 공개 예시 3개: 요청 문서의 사용 사례
  - 164/164 테스트 통과

### 검증
- TypeCheck: ✅ PASS
- Unit tests: ✅ PASS (164/164)
- lockfile: ✅ PASS
- Task records: ✅ PASS

### 문서
- [prd.md](agents/intent/specs/0040-lab/prd.md): 요구사항과 수용 기준
- [sdd.md](agents/intent/specs/0040-lab/sdd.md): 설계 및 대안·트레이드오프
- [trace.md](agents/intent/specs/0040-lab/trace.md): 구현 과정 기록

task 0040은 완료되었으며, `pnpm check`에서 모든 항목을 통과했습니다.
