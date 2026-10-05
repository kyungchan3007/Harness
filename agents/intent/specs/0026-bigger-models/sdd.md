# 0026 — 모호한 요청 실험을 큰 모델(Sonnet·Opus)로 다시 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 0024 sdd(결과·한계: 모델 1개), `experiments/ambiguity/run.mjs`(`--model` 있음, 결과 폴더가 그룹-번호라 모델 구분 불가), `experiments/role-split/lib.mjs`(prepareCopy의 ref)
- **접근:**
  1. `run.mjs`에 `groupKey(group, model)` — Haiku는 `A`, 다른 모델은 `A-sonnet`처럼 결과 폴더·집계 그룹을 나눔. 지시 문장은 그대로.
  2. `--ref` 추가 — 복사본을 0024 실행 때 저장소 상태(6af14ac)로. 그 뒤 main에 들어간 0024 결과 문서(README 로드맵의 결과 문장)가 복사본에 없고, 0025 장치도 없다.
  3. 실행: Sonnet 5.5 A·Q·BR, Opus 5.5 A·Q 각 3회. 판정은 0024 `judge.mjs` 그대로(Sonnet 5.5, 근거 인용 필수).
- **대안·트레이드오프:**
  - Opus BR까지: BR이 가장 비싸고(Haiku에서도 $0.59/회) 질문의 핵심은 A·Q의 차이 → 제외.
  - 채점 AI를 Opus로: Sonnet 결과를 Sonnet이 판정하는 편향을 줄이지만 0024와 기준이 달라짐 → 같은 채점자 유지, 한계에 적고 표본 직접 확인.
  - 최신 main으로 복사: 0024 결과 문장이 힌트로 새고 장치(0025)가 섞임 → 6af14ac 고정.
- **파일 계획:** `experiments/ambiguity/{run.mjs, judge-lib.test.mjs, runs/*-sonnet-*, runs/*-opus-*}`
- **위험:**
  - 큰 모델은 스스로 멈추고 물을 수 있음 → 그것 자체가 결과. 
  - 비용 → 실행 전 Haiku 기준으로 추정(약 $15~25), 실행 후 실측.
- **검증 계획:** groupKey 단위 테스트, 6af14ac 복사본 누출 검색, 15회 실행·판정, 표본 직접 확인, `pnpm check`

## 계획과 달라진 점
(실행 후 기록)

## 검증 결과
(실행 후 기록)
