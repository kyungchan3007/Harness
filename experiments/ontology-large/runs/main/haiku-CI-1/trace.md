# TRACE — 태스크 0040 과정 기록

## 2026-10-16 초기화 & 문서 작성

### 수행 내용
- [x] 요구사항 분석: 격리·보관 등급·예약 만료·운송 기능 4가지
- [x] 현재 구현 상태 파악
  - 기본 기능 구현됨 (receive, split, discard, move, transferCustody)
  - 예약 기본 구현됨 (reserve, cancel, consume)
  - 미구현: quarantine, release, advanceTime, startTransit, confirmArrival, cancelTransit
  - 미연결: 보관 등급 검사, 격리 제약, 운송 제약
- [x] 정책 문서 검토 (5개 모두: engine.md, storage.md, quality.md, reservations.md, transit.md)
- [x] 태스크 폴더 생성 (agents/intent/specs/0040-lab/)
- [x] prd.md 작성 (Acceptance 체크박스, 애매한 곳·가정 포함)
- [x] sdd.md 작성 (접근, 아키텍처, 구현계획, 위험, 대안·트레이드오프, 검증)
- [x] TASKS.md 점유 (0040 추가)
- [x] trace.md 초기화

### 설계 결정
- **모듈 구조 유지**: 기존 4단계 아키텍처 (Engine → Storage → State → Modules) 그대로
- **점유 추적**: 운송 목적 용기도 occupied 맵 활용 (CONTAINER_OCCUPIED 재사용)
- **운송 추적**: 시료별 ACTIVE 운송 매핑 필요 (새 맵 추가)
- **등급 상속**: split에서 부모의 등급 복사 (호출자 미지정)
- **예약 만료 판정**: expiresAt ≤ now (경계 포함)

### 온톨로지 검사 발견 사항
- I8: 미구현 메서드가 예외를 throw → ErrorCode 반환해야 함
- I9: 실패한 eventId 기록 안 됨 (예외 때문에 관련)
- I12: split에서 보관 등급 검사 누락 (AMBIENT을 CHILLED에 넣음)
- I13: reserve에서 expiresAt ≤ now 검사 누락 + advanceTime 미구현

### 다음 단계
- [진행 중] Builder 에이전트: 1단계~4단계 구현 (quality.ts, samples.ts, reservations.ts, transit.ts)
- [대기] 구현 완료 후 pnpm check 통과 확인
- [마무리] 허점·보완점·토큰 기록

## 2026-10-16 구현 시작

### 발견 사항
- **SDD 형식 문제 (설계자 작업)**: guard check가 sdd.md에서 "- **접근:**", "- **대안·트레이드오프:**", "- **검증 계획:**" 형식을 요구하지만, 현재 "##" 제목 형식으로 작성됨. 템플릿(agents/intent/templates/sdd.md) 참조하여 수정 필요. 이는 설계자 역할이므로 설계자에게 넘김.

### 구현 순서 조정
SDD 형식 문제로 guard가 막고 있으므로, 다음 우회 계획:
1. trace.md 기록 먼저 수정 (기록 경로이므로 자유)
2. 설계자가 sdd.md 수정 후 재시작

## 허점 및 보완

(작업 진행 중 발견 항목 기록)

## 컨텍스트 및 토큰

Builder 에이전트 구현 진행 중 (2026-10-16 시작, SDD 형식 issue로 일시 중단)
