# 0010 — README 정리 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 기존 README, TASKS.md, LEARNINGS.md, guardrails.md(자동 강제), observability.md
- **접근:** 위에서 아래로 "무엇 → 왜 → 어떻게(흐름도) → 기록·강제(표) → 결과 → 사용법 → 구조" 순서. 문장은 요약 한 줄과 "왜"만 두고 나머지는 표·불릿·다이어그램으로.
- **대안·트레이드오프:**
  - 흐름도를 이미지(PNG)로: 보기 좋지만 문서와 따로 놀아 갱신이 누락된다. → GitHub가 렌더하는 mermaid로, 텍스트라 diff도 보인다.
  - 상세 내용을 README에 모두: 길어져서 한눈에 안 들어온다. → README는 요약과 링크, 상세는 agents/ 문서.
  - 영어 README: 공개 repo 도달 범위는 넓지만 기록 문서가 전부 한국어라 어긋난다. → 한국어 유지.
- **파일 계획:** `README.md`, `agents/orchestration/TASKS.md`(0004 대체 표기)
- **위험:** README 수치(테스트 수 등)가 금방 낡는다. → 수치는 최소화하고 변하지 않는 구조 위주로 쓴다.
- **검증 계획:** mermaid 문법을 GitHub 렌더링으로 확인, 링크 경로 존재 확인 스크립트, `pnpm check`

## 계획과 달라진 점
- 없음. 실험 현황 표에 0010 자신도 넣었다(현황표가 TASKS와 어긋나지 않게).

## 검증 결과
- README 상대 링크 전부 존재 확인 (스크립트)
- mermaid 흐름도: mermaid-cli로 렌더링 성공 (문법 오류 없음)
- 로드맵이 TASKS.md와 일치: 0004는 "0009로 대체", 나머지 todo는 ⏳
- `pnpm check`: ALL PASS
