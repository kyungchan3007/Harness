# 0030 — 주문 시 포인트 적립 — Trace

에이전트가 **작업하는 동안** 직접 남기는 과정 기록입니다. 도구 호출 전체는 hooks가 `trace.auto.jsonl`에 자동으로 남깁니다(`pnpm trace 0030`으로 확인).
직접 기록에는 자동 기록이 못 남기는 것, 즉 **판단과 이유, 막힘, 되돌림**을 씁니다.

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | request.md 확인 | 원문: 결제금액 1% 적립, 쿠폰/VIP는 수치 미정. domain.md에 규칙 추가 필요. |
| 2 | DEFINE | prd.md 작성 | 설계 결정 3개 명시: 쿠폰 -20%, VIP +50%, 최소값 0. 완료 조건 9개로 구체화. |
| 3 | PLAN | sdd.md 작성 | 0002 패턴 따름: 순수 함수, number 타입, Math.round 반올림. VIP/쿠폰은 boolean 옵션, 곱셈. 테스트 8개 규칙별 대응. |
| 4 | PLAN | trace.md 작성 | 이 파일. 자동 기록은 hook으로 별도 수집. |
| 5 | DEFINE | prd.md 형식 수정 | 가정/확인 필요 표시 추가 (가드레일 요구). |
| 6 | DEFINE | domain.md 규칙 추가 | 포인트 규칙 1~8 추가 (반올림, 최소값, VIP×쿠폰 중복 명시). |

| 7 | BUILD | src/pricing/points.ts 구현 | calculatePoints 순수 함수 구현. 기본 1%, 쿠폰 0.8%, VIP 1.5%, 중복 1.2%. Math.round로 반올림. assertWon으로 입력 검증. |
| 8 | BUILD | src/pricing/points.test.ts 작성 | domain.md 규칙 1~8 각각에 테스트 1개 이상 대응. 총 17개 테스트 (경계값·옵션 기본값·입력 검증 포함). |
| 9 | GATE | pnpm check 실행 | Typecheck ✅, Unit tests ✅ (130 tests 모두), Lockfile ✅, Task records ✅. **ALL PASS**. |
| 10 | RECORD | trace.md 업데이트 | BUILD·GATE 단계 기록. 설계대로 구현 완료. |

| 11 | VERIFY | 원문·domain.md·prd.md 대조 | request.md 요구사항 4개 모두 domain.md 규칙 1~8으로 구체화. prd.md 완료 조건 11개 모두 충족. |
| 12 | VERIFY | 구현·테스트 검증 | calculatePoints 함수 구현 확인. points.test.ts 17개 테스트 모두 domain.md 규칙 1~8에 대응 (규칙 2,3,4,5,6 각각 2개 이상). |
| 13 | VERIFY | 경계값 검증 | 반올림: 9501→95, 9499→95, 6667 VIP→100 정확. 최소값: 1→0, 30→0, 50→1 정확. 중복: 1%×0.8×1.5=1.2% 계산 확인. |
| 14 | VERIFY | verdict.md 작성·검증 | 판정 근거·확인·원문 대조 섹션 작성. `pnpm verdict` 형식 검증 통과. 판정: **APPROVED**. |

## 구현 세부

### points.ts
- 함수 시그니처: `calculatePoints(total: Won, options?: { couponUsed?: boolean; isVip?: boolean }): number`
- 상수: BASIC_RATE=0.01, COUPON_RATE=0.8, VIP_RATE=1.5
- 로직: base = total × 0.01, 쿠폰이면 ×0.8, VIP면 ×1.5, Math.round로 정수화, Math.max(0, ...)로 최소값 보장

### points.test.ts
- 규칙 1 (정수성): 1개 테스트
- 규칙 2 (기본 1%): 2개 테스트 (단일, 다양한 금액)
- 규칙 3 (쿠폰 0.8%): 2개 테스트
- 규칙 4 (VIP 1.5%): 2개 테스트
- 규칙 5 (VIP+쿠폰 1.2%): 2개 테스트
- 규칙 6 (반올림): 5개 테스트 (경계값 포함)
- 규칙 7 (최소값 0): 3개 테스트
- 규칙 8 (total=0): 1개 테스트
- 추가: 입력 검증, 옵션 기본값 (총 17개 테스트)

## 계획과 달라진 점

없음. SDD 설계대로 구현 완료.

## 검사 결과 요약

- 원문: 결제금액 1%, 쿠폰 감소, VIP 증가, 정수 단위 ✓
- domain.md 규칙 1~8: 모두 구현·테스트 대응 ✓
- prd.md 완료 조건 11개: 모두 충족 ✓
- pnpm check: ALL PASS ✓
- verdict.md: APPROVED ✓
