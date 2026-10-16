## AI

완료되었습니다! ✅

**태스크 0040: 연구실 시료 보관 엔진**

규칙 R1-R8을 완전히 구현한 메모리 기반 `createLab(catalog: Catalog): Lab` 함수가 완성되었습니다.

## 구현 내용
- **R1 참조·수용:** ID 유일성, 용기 점유, 용량 검증
- **R2 계보·수량 보존:** 분취, 자식 추적, 양 균형 검증
- **R3 예약·소비:** 이용 가능량 = 남은 양 - ACTIVE 예약
- **R4 상태·폐기:** ACTIVE → DEPLETED|DISCARDED (불가역)
- **R5 용기·장소:** 컨테이너 이동, 빈 용기 재사용
- **R6 보관 책임:** 책임자 이전 (자식 무관)
- **R7 멱등성:** 같은 eventId+args 재전송 → 첫 Receipt 반환, 상태 불변
- **R8 원자성·이력:** 성공시만 기록, 실패시 롤백

## 테스트 결과
- ✅ Typecheck: TypeScript 안전성
- ✅ Unit tests: 128개 모두 통과
- ✅ Task records: 문서 검증 완료
- ✅ **ALL PASS — 완료 선언 가능**

## 주요 설계 결정
- **멱등성 키:** `${eventId}:${JSON.stringify(args)}` (args 배열 순서 구별)
- **복사:** JSON.parse(JSON.stringify()) (표준 기능만)
- **에러 순서:** 멱등성 먼저 (R7 명령)

코드와 문서(`prd.md`, `sdd.md`, `trace.md`)는 모두 브랜치 `task/0040-lab`에 커밋되었습니다.
