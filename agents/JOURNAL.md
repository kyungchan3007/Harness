# JOURNAL — 사후 결과 로그 (append-only)

## 2026-09-29 · 0001 뼈대 구성 · claude
- **무엇:** TS 샌드박스, 메모 도메인, 4계층 문서, `pnpm check` 게이트
- **왜:** ClauseLens 작업 루프와 분리해서 하네스를 실험하기 위해
- **게이트:** ALL PASS
- **드러난 공백:** CI 없음 → 0002
- **다음:** 0003 hooks 가드레일 실험

## 2026-09-29 · 0002 도메인 전환: 장바구니 금액 계산 · claude
- **무엇:** 메모 도메인 제거. `Cart`(장바구니 규칙 1~5), `priceCart`(배송비 규칙 1~3), `domain.md` 추가
- **왜:** 메모 CRUD는 에이전트가 틀릴 일이 없어 하네스 효과를 관찰할 수 없음
- **파일:** `src/{money.ts,cart/,pricing/}`, `agents/context/{domain,architecture}.md`, spec 0002
- **게이트:** ALL PASS (테스트 13개)
- **드러난 공백:** 규칙-테스트 추적을 테스트 이름 관례로만 지키고 있음. 게이트가 강제하지 않음
- **다음:** 0003 쿠폰 규칙 (Intent 실험)
