# 0030 — 포인트 적립 기능 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 태스크 0030 claim: 포인트 적립 기능 설계 | request.md 읽기 및 요구사항 파악 |
| 2 | CONTEXT | request.md 확인: 요구사항이 일부 모호함 | "좀 줄여 주세요"(쿠폰), "더 많이"(VIP) → 설계 결정 필요 |
| 3 | CONTEXT | domain.md 읽기: 기존 금액·할인 규칙 확인 | 배송비 규칙과 유사한 구조로 포인트 규칙 작성 |
| 4 | CONTEXT | 0002 spec 참고: PRD/SDD 형식 및 domain.md 작성 패턴 확인 | architecture.md의 모듈 구조를 따름 |
| 5 | DESIGN | 쿠폰 감소율 결정: 50% | request: "좀 줄여 주세요" → 명확한 비율 필요 → 50%는 직관적(절반)이고 비즈니스 가치 표현 명확 |
| 6 | DESIGN | VIP 배수 결정: 1.5배 | request: "더 많이" → 배수 필요 → 1.5배는 50% 증가로 VIP의 가치를 적당히 표현 |
| 7 | DESIGN | 계산 순서 결정: 곱하기로 순차 적용 | base → ×couponMultiplier → ×vipMultiplier. 순서 무관(교환법칙) |
| 8 | DESIGN | 반올림 결정: 내림(floor) | 포인트는 정수 필수. 내림이 공정 (정수 제약이지 고객 손해 아님) |
| 9 | DESIGN | 입력 검증: total ≥ 0 정수만 | domain.md의 "원(Won)은 항상 0 이상 정수" 규칙 따름 |
| 10 | DESIGN | 함수 이름: `earnPoints` | 의도 명확 (vs `calculatePoints`, `getPoints`) |
| 11 | SPEC | PRD 작성: Acceptance는 규칙 1~4로 매핑 | 테스트 가능한 조건으로 표현 |
| 12 | SPEC | SDD 작성: 대안·트레이드오프 섹션에 설계 결정 근거 기록 | 향후 변경 근거 제공 |
| 13 | SPEC | domain.md 업데이트 준비: 포인트 규칙 1~4 추가 | "포인트 규칙" 섹션 신규 작성 |
| 14 | SPEC | TASKS.md 업데이트 준비: 0030 행 추가 | owner: -, status: in-progress |
| 15 | BUILD | src/pricing/points.ts 작성 | earnPoints(total, options) 함수 구현 - basePoints 계산, 쿠폰/VIP 배수 적용, floor로 정수화 |
| 16 | BUILD | src/pricing/points.test.ts 작성 | 규칙 1~4별 테스트(16개) + 경계값 테스트(6개) + 입력 검증(3개) = 총 25개 테스트 |
| 17 | GATE | pnpm check 실행 | ✅ typecheck ✅ unit tests (130 pass) ✅ no lockfiles ✅ task records |
| 18 | RECORD | trace.md 업데이트 | BUILD/GATE 단계 기록 |
| 19 | VERIFY | request.md 원문 확인 | 원문 요구사항 5개 항목 모두 읽음: 1% 적립, 쿠폰 감소, VIP 증가, 정수, 파일 위치 |
| 20 | VERIFY | domain.md 규칙 1~4 확인 | 규칙 1~4 정확히 읽음: 각 규칙의 계산식, 배수, 내림 처리 명확 |
| 21 | VERIFY | prd.md Acceptance Criteria 검증 | 7개 항목 모두 확인: 규칙 1~4 테스트, 경계값, 함수 시그니처, pnpm check pass |
| 22 | VERIFY | points.ts 구현 리뷰 | 함수 시그니처, 주석, 계산 로직, 입력 검증(assertWon) 모두 정확 |
| 23 | VERIFY | points.test.ts 테스트 리뷰 | 25개 테스트 확인: 규칙 1~4(16개) + 경계값(6개) + 입력 검증(3개) |
| 24 | VERIFY | 경계값 직접 확인 | 0원, 1원, 99원, 100원, 150원, 200원 케이스 모두 확인 |
| 25 | VERIFY | pnpm check 재확인 | ✅ 130 tests passed, ALL PASS 재확인 |
| 26 | VERIFY | 원문↔domain↔구현↔테스트 대조 | 5개 항목 모두 연쇄적 일치 확인 |
| 27 | RECORD | verdict.md 작성 | 판정: approved, 확인한 것 상세 기록, 원문 대조 6개 항목 검증 완료 |
| 28 | RECORD | pnpm verdict 실행 | ✅ verdict 형식 유효성 확인, 판정 1회 반려 0/2 |
