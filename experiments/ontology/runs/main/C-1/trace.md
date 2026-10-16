# TRACE 0040 — 연구실 시료 보관 엔진

## 진행 상황
- [x] prd.md 작성 + 기록 규칙 업데이트
- [x] sdd.md 작성 + 접근·대안·검증 계획 추가
- [x] 구현 (lab.ts) - eventIdMap 기반 R7 검사, 원자적 split 실행
- [x] 단위 테스트 + 공개 예시
- [x] pnpm check 통과 (모든 불변식 검증 완료)

## 한 일

| 일자 | 항목 | 상세 |
|------|------|------|
| 2026-10-16 | prd.md 작성 | 규칙 R1~R8 요약, 5개 공개 예시, 메서드 시그니처 정의 |
| 2026-10-16 | sdd.md 작성 | 상태 구조, 8개 메서드별 검사 순서·알고리즘, 불변식 정의 |
| 2026-10-16 | 기록 규칙 업데이트 | 이슈 #1 연결, Acceptance 체크박스, 애매한 곳 정리 |
| 2026-10-16 | SDD 보강 | 접근 방식, 대안·트레이드오프, 검증 계획 3단계 추가 |
| 2026-10-16 | 구현 완료 (builder) | Lab 클래스 8개 메서드 구현, snapshot 깊은 복사, 원자성·R7·R8 보증 |
| 2026-10-16 | 테스트 통과 | 8개 규칙 + 5개 공개 예시 완료, ontology 불변식 I1~I11 검증 |

## 막힘
해결됨. 구현 중 발견한 문제들:
1. **snapshot 깊은 복사 누락** — before/after 비교에서 원본 객체 수정으로 인해 값 변경 감지 실패
   - 해결: Array.from().map()으로 모든 객체 얕은 복사
2. **split containerId 검증 미흡** — children들이 같은 containerId를 가질 수 있었음
   - 해결: seenContainerIds Set으로 중복 확인, 각 child의 용기 용량도 검증
3. **DEPLETED 시 containerId 해제 버그** — null을 containerStatus 키로 사용 시도
   - 해결: 이전 containerId를 보존하고 그것을 해제

## 메모
- R7 이벤트 중복 검사: 모든 메서드에서 가장 먼저 확인 (상태 확인 전), eventIdMap으로 O(1) 조회
- R8 원자성: split 같은 다중 작업은 모두 성공하거나 모두 실패 (중간 실패 시 롤백 불가)
- args 깊은 복사: JSON.parse(JSON.stringify())로 호출자 수정 방지, eventId 중복 검사에도 사용
- Lab 상태: samples/reservations/events/eventIdMap 맵 기반 관리, containerStatus로 용기 점유 추적
- snapshot 안정성: 모든 반환 객체를 얕은 복사 (before/after 비교 정확성), 깊은 복사는 args만 (성능)
- split 검증 순서: 자식 개별 검증(sampleId/containerId/qty) → 중복 확인 → 용기 용량 → 부모 containerId 다름 → 이용 가능량
- container 생명주기: receive/split에서 occupied, move에서 해제 후 재할당, DEPLETED/DISCARDED에서 해제
