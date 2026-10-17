# 0040 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #1, 브랜치 `task/0040-lab`, TASKS 점유 | 이미 체크아웃돼 있어 그대로 사용 |
| 2 | EXPLORE | 정책 문서 5개와 src/lab 전부를 읽음 | 정책 주석(등급 상속, 운송 점유)이 코드에 있어 그대로 따름 |
| 3 | BUILD | quality·reservations·samples·transit 구현, state.inTransit 추가, 등급 검사를 4곳에 연결 | 운송 목적 확보는 occupied 재사용 → isFree 하나로 받기·분취·이동·운송을 모두 막음 |
| 4 | VERIFY | src/lab/lab.test.ts 8개(격리·등급·만료 경계·운송·재전송) 통과 | 만료는 expiresAt == now에서도 발생, 분취 자식은 부모 등급 상속 |
| 5 | GATE | `pnpm check` | `pnpm request 1`은 gh 접근이 없어 request.md를 만들지 못함 |
