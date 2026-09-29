# Guardrails

## 해도 됨
- `src/`, `agents/` 안에서의 읽기·수정, `pnpm check` 실행
- 태스크 브랜치 생성·커밋

## 사용자 확인 필요
- `main`에 직접 push, force push, 히스토리 재작성
- 의존성 추가·메이저 업그레이드
- 게이트(`checks.sh`) 검사 삭제 또는 완화

## 금지
- spec 없이 코드 작성
- 테스트를 skip/삭제해서 게이트 통과
- 비밀값(.env, 토큰) 커밋
