완료했습니다! 🎉 작업 0033 포인트 적립 기능이 완성되었습니다.

## 요약

**구현 내용:**
- **함수**: `calculatePoints(subtotalMinusDiscount, options?)` 순수 함수
- **기본 적립**: 할인 후 상품 금액의 1% (정수 단위, 버림)
- **VIP 배율**: 2배
- **자동 할인 반영**: 쿠폰 사용 시 포인트도 함께 감소

**테스트 & 검증:**
- 18개의 신규 단위 테스트 (도메인 규칙 1~6 + 경계값 + 대금액 + 입력 검증)
- 총 136개 테스트 모두 PASS
- 경계값: 99원(0포인트) / 100원(1포인트) 검증
- VIP 배율: 2배 검증

**문서 & 기록:**
- `agents/intent/specs/0033-points/`: PRD, SDD, Trace 작성
- `agents/context/domain.md`: 포인트 규칙 6개 추가
- `agents/orchestration/TASKS.md`: 작업 0033 등록 및 완료 표시
- `agents/JOURNAL.md`: 작업 기록 추가

**게이트:** ✅ ALL PASS (Typecheck, 136개 테스트, lockfile, task records)
