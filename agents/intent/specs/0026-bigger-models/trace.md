# 0026 — Trace

| 순서 | 단계 | 한 일 | 판단·이유 |
| --- | --- | --- | --- |
| 1 | CLAIM | 이슈 #31 → `task/0026-bigger-models` (별도 작업 폴더 harness-lab-0026) | 0025 실행이 원래 폴더에서 도는 중이라 브랜치를 바꿀 수 없음 |
| 2 | BUILD | `groupKey`·`--ref` 추가 | 모델별 결과가 섞이지 않게, 저장소 상태를 0024와 같게 |
| 3 | VERIFY | 6af14ac 복사본 검색 → README에 "모호한 spec에 되묻는가 (쿠폰 규칙) 대기" 2줄 | 0024 실행 때도 같은 줄이 있었음(계획 문구, 결과 아님) → 같은 조건이라 그대로 둠 |
| 4 | VERIFY | Opus 6번이 0.04분에 끝남 → "CLI 2.1.280 이상 필요" | 설치된 CLI를 바꾸지 않고 데스크톱 앱 내장 2.1.286을 `CLAUDE_BIN`으로. 실행마다 CLI 버전 기록 |
| 5 | VERIFY | Sonnet A 6번 중 3번 `reasoning_extraction` 거절 | 직전 행동은 문서 읽기뿐. 끊긴 실행은 `_invalid/`로, 같은 번호로 다시. `apiError` 표시 추가 |
| 6 | VERIFY | 15번 판정 + M1·Opus A 직접 확인 | 큰 모델은 15번 모두 "결제 금액=total=배송비 포함"을 짚음. Opus는 지시 없이 3/3 멈추고 물음 |
| 7 | RECORD | sdd 결과·LEARNINGS·JOURNAL·README | 0024의 "몰래 채운다"는 Haiku 한정이었다고 정정 |
