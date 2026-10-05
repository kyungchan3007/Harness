## ✅ 작업 완료!

**포인트 적립 기능(0030)이 완성되었습니다.**

### 완성된 것
- ✅ **코드 구현** (`src/pricing/points.ts`)
  - `calcPoints(total, options)` 순수 함수
  - 결제 금액 기반 포인트 계산 (내림 처리)
  
- ✅ **테스트** (`src/pricing/points.test.ts`)
  - 32개 테스트 케이스
  - 규칙 1~4 모두 커버 (기본 1%, 쿠폰 50% 감소, VIP 2배, 내림)
  - 경계값 및 입력 검증 테스트

- ✅ **문서 작성**
  - **prd.md**: 요구사항·acceptance·애매한 부분 정의
  - **sdd.md**: 설계·대안·검증 결과
  - **trace.md**: 작업 과정 기록 (9단계)
  - **domain.md**: 포인트 규칙 1~4 추가

- ✅ **기록 업데이트**
  - TASKS.md: 0030 → done
  - JOURNAL.md: 0030 완료 기록

- ✅ **게이트 통과**
  - `pnpm check` ALL PASS
  - Typecheck, 133개 단위 테스트, lockfile, task records

### 커밋
- `1f6461a` feat(0030): 포인트 적립 기능 구현
- `dea54f1` [0030] chore: 포인트 적립 spec·trace·기록 마무리
