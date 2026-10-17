# 0040 — 시료 보관 엔진 확장 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** `src/lab/types.ts` (공개 계약), `docs/{engine,quality,storage,reservations,transit}.md` (정책), `src/lab/{samples,reservations,quality,storage,transit,events}.ts` (기존 구현), `agents/ontology/ontology.json` (불변식)

- **접근:**
  1. **격리** (quality.ts): `quarantine`·`release`는 ACTIVE 시료의 `quarantined` 설정 (멱등성). `split`·`reserve`·`consume`에서 격리 체크 추가.
  2. **보관 등급**: `receive`·`split`·`move`·`startTransit`에서 `storage.supports(containerId, grade)` 검사 추가. split 자식은 부모의 `storageGrade` 상속.
  3. **예약 만료** (reservations.ts): `advanceTime(eventId, to)`는 절대 시각으로 now 진행. reserve에서 expiresAt 검증 (null 또는 expiresAt > now). advanceTime 실행 시 expiresAt ≤ now인 ACTIVE 예약 → EXPIRED (reserved 풀림).
  4. **운송** (transit.ts): 세 메서드 구현. `startTransit`: 시료·운송 ACTIVE, 목적 용기 빔·용량·등급. `confirmArrival`·`cancelTransit`: 운송 상태 변환·용기 배정 처리. split·consume·discard·move에서 IN_TRANSIT 체크 추가.
  5. **용기 점유** (storage.ts): isFree() 확인 시 occupied + ACTIVE 운송의 목적지 체크.

- **대안·트레이드오프:**
  - 용기 확보 추적: State 새 필드 vs. transits 맵 스캔 → 선택: 스캔 (코드 단순, 운송 수 적음 → O(n) 무시)
  - expiresAt 검증 시점: reserve 호출 vs. advanceTime → 선택: reserve 호출 (명령 시점에 검증, 선명한 오류)
  - 격리·운송 상호작용: 부분 제약 vs. 완전 금지 → 선택: 부분 (정책 문서 따름)

- **파일 계획:**
  1. storage.ts: isFree() 수정 (ACTIVE 운송 목적지 확인)
  2. quality.ts: quarantine, release 구현; samples.ts에서 호출
  3. reservations.ts: advanceTime 구현, reserve에서 expiresAt 검증
  4. transit.ts: 세 메서드 구현 (transits 맵 관리, 용기 점유 처리)
  5. samples.ts: receive·split·move에서 보관 등급 검사, split·reserve·consume에서 격리 체크, split·consume·discard·move에서 운송 중 체크

- **위험:**
  - 운송 중 용기 점유 규칙 복잡 → 단위 테스트로 모든 조합 검증
  - 만료 시각 경계 (expiresAt ≤ now) → 테스트에서 정확히 일치하는 경우 포함
  - 격리·운송·예약 상호작용 → 조합 테스트 추가 (격리 중 운송, 만료 예약 있는 시료 폐기 등)
  - 재전송 판정: I9 불변식 (같은 eventId 다른 명령 → EVENT_CONFLICT) 확인 필요

- **검증 계획:**
  - 단위 테스트: 각 명령별 성공·실패 케이스 + 경계값 (expiresAt == now, 용기 용량 경계 등)
  - 조합 테스트: 격리+운송, 만료+운송, 예약+폐기 등 도메인 간 상호작용
  - 회귀 테스트: 기존 8개 명령 작동 확인
  - 불변식 검증 (pnpm onto:check): I8·I9·I12·I13·I14 특히 주의
  - 최종: pnpm check ALL PASS

## 계획과 달라진 점
(현재는 실행 전이므로 미작성)

## 검증 결과
(현재는 실행 전이므로 미작성)
