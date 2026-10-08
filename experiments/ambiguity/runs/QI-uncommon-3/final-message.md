완료했습니다! 🎉

## 작업 결과

**포인트 적립 기능 구현 완료** (태스크 0030, 이슈 #1)

### 구현 내용
- **파일:** `src/pricing/points.ts` + `src/pricing/points.test.ts`
- **함수:** `calculatePoints(priceBreakdown: PriceBreakdown, member: Member): Won`

### 기능
| 회원등급 | 쿠폰 | 적립률 |
|---------|------|--------|
| NORMAL | 없음 | 1% |
| NORMAL | 사용 | 0% |
| VIP | 무관 | 3% |

- 포인트는 반올림으로 정수 변환 (0.5 이상 올림)
- 입력 검증: 회원 등급 확인, Won 타입 보장

### 게이트 상태
✅ **ALL PASS**
- 타입 체크: PASS
- 단위 테스트: 116개 ALL PASS (포인트 관련 11개)
- 기록 검증: PASS

### 커밋
1. `feat: 포인트 적립 기능 구현 (#1)` — 코드 + 테스트
2. `docs: 0030 포인트 적립 기능 JOURNAL 기록` — 작업 기록
