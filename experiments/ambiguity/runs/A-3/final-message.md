✅ **스펙 작성 완료**

문서를 모두 작성했습니다:

- **[prd.md](agents/intent/specs/0030-points/prd.md)**: 사용자 요청을 기반으로 기본 규칙(1% 기본, 쿠폰 감소, VIP 보너스), 완료 조건 정의
- **[sdd.md](agents/intent/specs/0030-points/sdd.md)**: 3단계 계산 로직(기본적립 → 쿠폰조정 → VIP보너스), 데이터 모델, 테스트 케이스 정의
- **[trace.md](agents/intent/specs/0030-points/trace.md)**: 과정 기록 시작
- **TASKS.md 업데이트**: 태스크 0030 추가

다음은 `src/pricing/points.ts` 구현입니다. builder 에이전트로 진행할까요?
