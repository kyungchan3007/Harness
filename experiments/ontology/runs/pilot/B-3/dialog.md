## AI

작업이 완료되었습니다! 🎉

## 요약

**0040-lab: 연구실 시료 보관 엔진** 구현을 완료했습니다.

### 결과
- ✅ 타입 검사: PASS
- ✅ 단위 테스트: 128/128 통과
- ✅ 모든 게이트: PASS
- ✅ 기록: prd.md, sdd.md, trace.md 작성

### 구현 사항
**`createLab(catalog: Catalog): Lab`** 내보내기
- **8가지 명령**: receive, split, reserve, cancel, consume, discard, move, transferCustody
- **R1~R8 규칙 완전 구현**:
  - R1 참조·수용 (UNKNOWN_*, ID_TAKEN 등)
  - R2 계보·수량 보존 (부모-자식 계보 추적)
  - R3 예약·소비 (이용 가능량 = remaining - reserved)
  - R4 상태·폐기 (ACTIVE → DEPLETED/DISCARDED)
  - R5 용기·장소 (용기 한 개 시료, 용량 검사)
  - R6 보관 책임 (책임자 승계·변경)
  - R7 멱등성 (같은 eventId 재전송 시 처음 Receipt 반환)
  - R8 원자성 (모든 검사 성공 시에만 상태 변경)

### 설계 특징
- **상태 기계 + 이벤트 로그**: eventIdToReceipt 캐시로 멱등성 보장
- **맵 기반 저장소**: O(1) 조회 성능
- **argsEqual**: 객체 순서 무시, 배열 순서 구별 (R7.3 준수)

### 커밋
- 6a5e62f: 구현 + R1~R8 규칙 검증
- a4b1c0e: 완료 (types.js 확장자 추가 + prd 체크박스)

모든 테스트가 통과하고 게이트 검사도 완료되었습니다. 다음 작업으로 진행할 준비가 되었습니다!
