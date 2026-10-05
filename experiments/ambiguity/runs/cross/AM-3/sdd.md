# 0030 — 포인트 적립 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** AGENTS.md, harness/loop.md, context/architecture.md, context/domain.md
- **접근:**
  - `src/pricing/points.ts`: `calculatePoints(total, discount, isVip)` 순수 함수
  - 기본 적립: `Math.floor(total * 0.01)` (1% 소수점 버림)
  - 할인 조정: `baseePoints - Math.floor(discount * 0.01)` (할인받은 금액의 포인트 제외)
  - VIP 배수: `points * 2` (VIP 회원)
  - 최소값 보장: `Math.max(0, finalPoints)` (0 이상)
  - 포인트는 항상 정수로 다룬다
- **대안·트레이드오프:**
  - 할인 조정 방식: (1) 할인 금액 제외, (2) 할인율 적용, (3) 할인 후 금액 기준
    - 선택: (1) 할인 금액 제외. 직관적이고 공정한 로직. 할인받은 금액만큼 포인트도 제외한다.
  - VIP 배수: 2배 (요청 "더 많이"를 구체적으로 정의)
  - 최소 적립: 결제 금액이 있으면 최소 1포인트 → 할인 후 0 이하면 0으로 정규화 (더 보수적, 음수 방지)
- **파일 계획:** `src/pricing/points.ts`(+test), `agents/context/domain.md` 포인트 규칙 추가, architecture.md 갱신
- **위험:** 음수 포인트 생성 (할인이 과도할 경우) → `Math.max(0, points)` 보장
- **검증 계획:** 규칙별 단위 테스트, 경계값 테스트, `pnpm check`

## 검증 결과
- `pnpm check`: 진행 중...
