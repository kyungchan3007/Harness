# 0040 — 시료 보관 엔진 확장: 격리·보관 등급·예약 만료·운송 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **접근:**
  - 4가지 기능(격리·등급·만료·운송)을 독립적 모듈로 구현하되, 기존 Engine·State·Storage 아키텍처 유지
  - 각 모듈은 정책 문서(engine.md, storage.md, quality.md, reservations.md, transit.md) 준수
  - 격리: quarantine/release, 격리 중 제약 연결
  - 등급: Storage.supports() 검사, split은 부모 등급 상속
  - 만료: advanceTime 구현, 예약 일괄 EXPIRED 전환
  - 운송: startTransit/confirmArrival/cancelTransit, 운송 중 명령 제약

- **대안·트레이드오프:**
  - 운송 추적: sampleId→transitId 맵 vs transits 순회 → O(1) 맵 선택 (빈번한 체크)
  - 격리와 예약: quarantine은 기존 예약 건드리지 않음 → 예약 그대로 유지
  - 만료 판정: expiresAt ≤ now 포함 vs 미포함 → 경계 포함 선택

- **파일 계획:**
  - src/lab/quality.ts: quarantine, release 구현
  - src/lab/samples.ts: receive/split/move에서 보관 등급 검사, split 등급 상속
  - src/lab/reservations.ts: reserve에서 expiresAt 검사, advanceTime 구현
  - src/lab/transit.ts: startTransit, confirmArrival, cancelTransit 구현

- **위험:**
  - 운송 중 명령 제약을 모든 모듈에 정확히 추가해야 함 (누락 시 ontology 위반)
  - 격리·운송·예약 만료의 상호작용이 복잡함
  - 실패한 eventId 기록 안 됨 규칙 준수 (I9)

- **검증 계획:**
  - 단위 테스트: 각 기능별 정상·오류 경로
  - 통합 테스트: 격리+만료, 격리+운송, 운송+만료, 등급+운송
  - 게이트: `pnpm check` PASS + ontology I1-I14 검증
