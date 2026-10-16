# 0040 — 연구실 시료 보관 엔진 — SDD

- **접근:** 메모리 기반 Lab 클래스를 Map으로 구현, 멱등성 검사 → 입력 검증 → 상태 변경 → 이벤트 기록 순서 처리
- **대안·트레이드오프:**
  - 멱등성 키: JSON.stringify() 선택 (간단, args 보존)
  - 복사: JSON 방식 선택 (표준 기능만)
  - 에러 순서: 멱등성 먼저 (R7 명령)
- **검증 계획:**
  - 단위: receive·split·reserve·cancel·discard·move·transferCustody 각 성공/실패 케이스
  - 통합: 공개 예제 8개 (계보, 수량 균형, 멱등성, 원자성)
  - 멱등성: 같은 eventId+args 재전송 → 첫 Receipt 반환, 상태 불변
