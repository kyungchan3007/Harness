# 0040 — 연구실 시료 보관 엔진 — 과정 기록

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | DEFINE | prd.md, sdd.md 작성 | 규칙 8개(R1~R8)가 명확히 정의됨. 공개 예시 5가지로 경계값 입증 |
| 2 | PLAN | 상태 구조 설계: samples, reservations, eventLog, seq, containerMap | 원자성 보장과 이벤트 재전송(R7) 처리를 위해 성공한 명령만 기록 |
| 3 | BUILD | src/lab/lab.ts: createLab, 8개 메서드, R1~R8 규칙 모두 구현 | 이용 가능량 계산(remaining - reserved), 예약의 전체 소비, containerId null 처리 |
| 4 | BUILD | 타입 수정: 파일 확장자 .js, 명시적 타입 지정 (containerMap, 파라미터) | ECMAScript import 모드 요구사항 충족 |
| 5 | GATE | pnpm check: Typecheck ✅, Unit tests ✅ 128 passed | 구현 완료 |

### 드러난 공백

- 없음 — 규칙이 명확하고 공개 예시로 검증됨
