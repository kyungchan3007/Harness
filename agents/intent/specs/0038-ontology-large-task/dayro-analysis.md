# Dayro 저장소 분석 (2026-10-16, 읽기 전용) — 0038 뒤 온톨로지 적용 판단용

## 제품·구성
- AI 데이트 코스 추천: 시간·지역·교통·목적 입력 → 후보 선택·순서 → 지도 → 저장·수정·공유·삭제
- `backend/dayro-backend`: Spring Boot 3.5 · Java 21 · JPA · PostgreSQL+pgvector · Redis · Spring AI(Gemini) · Google Places (~4.2k LOC)
- `frontend`: Next 16 · React 19 · TS · zod/mini · VSA · OpenNext Cloudflare · Storybook · MSW

## 에이전트 설정
- `frontend/.agents/domain/*.md` 13개(~1.7k줄)에 **문서형 온톨로지가 이미 있음**(용어·상태·전이·불변식 표) — 실행하는 검사는 없음
- `CLAUDE.md`에 `@import` 없음 · `.claude` hooks 없음 · 백엔드는 도메인 문서 없이 주석에만 규칙
- `frontend/aiagent.yaml`은 기계형이지만 에이전트 운영 온톨로지(제품 도메인 아님)

## 흩어진·어긋난 규칙 (예)
- 재추천 한도 5: BE `CourseRequestSessionStore.java` · FE `retry-policy.ts` · 주석 — 수동 동기화
- 익일 시간 계산·데이트 길이 2~12h: BE `TimeWindow.java`·`SituationInputRequest.java` / FE `time.ts`
- **장소 개수 불일치 의심:** 추천 targetCount(`CourseRecommendationServiceImpl.java:330`) ≠ 수정 최소(`CourseServiceImpl.java:139`, 주석은 "생성 시와 동일") ≠ FE `MIN_REQUIRED_PLACES = 1` · 저장은 `@NotEmpty` → 1곳짜리 9시간 코스는 수정 불가
- 재추천 실패 시 이전 후보 복귀(#143): 문서·React 훅(`useSituationFlowController.ts:184`)·BE에 흩어짐

## 검사 대상이 될 순수 계층
- FE: `course-flow.ts`(상태기계·스냅숏·prune) · `course-selection.ts` · `time.ts` · `retry-policy.ts` — 무작위 명령열 검사 최적
- BE: `TimeWindow` · `Course.reorderPlaces`(POJO) — 서비스는 mock·Testcontainers 필요

## 불변식 후보
1. 스냅숏 ≤ 50, order 집합 = revisions 키, 보호 rev는 퇴출 안 됨
2. append는 기존 rev를 덮어쓰지 않음, rev 형식
3. prune 뒤 operations·retries 키 ⊆ 살아 있는 스냅숏 참조
4. step별 사용 가능 조건(result → requestId, course → selectedPlaces ≥ 1)
5. toggleSelection: 길이 ≤ 5, 중복 없음, 원본 불변
6. FE·BE 시간 계산 일치 (교차 언어 표 테스트)
7. 재추천 retryCount ≤ 한도, 실패는 차감 없음
8. 수정 뒤 visitOrder 0..n−1 연속, 장소 ⊆ 기존, 개수 ≥ 최소
9. 저장 가능한 코스는 제목만 바꾸는 수정도 가능 (현재 위반 가능)
10. 탈퇴 뒤 회원의 코스·토큰·약관 0건

## 위험·비용
- 도메인 작음(BE 엔티티 9 · 명령 ~12), 핵심 상태기계는 FE 하나 → JSON 작성 비용 낮음
- LLM·외부 API·Redis TTL은 fake 필요, 실패 복귀 로직은 훅 안이라 순수 모델 추출 선행
- 기존 md 온톨로지와 새 JSON이 두 원본이 될 위험 → 하나를 원본으로
- Stop 훅 게이트는 FE vitest 쪽이 현실적
