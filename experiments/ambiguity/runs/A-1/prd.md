# 0030 — 포인트 적립 — PRD

- **이슈:** #1

## 개요

주문 완료 시 결제 금액에 따라 포인트를 적립하는 기능입니다.

## 요구사항

### 기본 적립률
- **기본**: 결제 금액(`total`)의 1%를 포인트로 적립
- 포인트는 **1포인트 단위(정수)**로 계산 (올림/내림/반올림 규칙은 SDD에서 정의)

### 쿠폰 사용 시 감소
- 쿠폰을 사용한 주문(`discount > 0`)은 적립률을 **감소**
- 구체적 감소 규칙: SDD에서 정의

### VIP 회원 추가 적립
- VIP 회원은 기본 적립률보다 **더 많이** 적립
- 구체적 배율: SDD에서 정의

### 구현 위치
- `src/pricing/points.ts`

## Acceptance

- [x] `calculatePoints` 함수가 `src/pricing/points.ts`에서 export됨
- [x] 기본 적립률(1%), 쿠폰 사용 시 감소(0.5%), VIP 배율(1.5배) 구현됨
- [x] `pnpm check` 통과 (타입, 테스트, lint)
- [x] 테스트 케이스 작성 완료 (기본, 쿠폰, VIP, 혼합, 엣지 케이스)

## 관련 문서

- Domain: [domain.md](../../context/domain.md)
- 설계: [sdd.md](./sdd.md)
- 기록: [trace.md](./trace.md)
