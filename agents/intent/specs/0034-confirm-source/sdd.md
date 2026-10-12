# 0034 — (확인됨: 답) 대화 기록 대조 — SDD

요구사항: [prd.md](prd.md)

## 설계
- **읽은 문서:** 0032·0033 sdd, `hooks/{guard,stop-check}.mjs`, `hooks/lib/records.mjs`, `metrics/lib.mjs`(typedText), 0033 복사본 대화 기록 3개
- **접근:**
  1. `hooks/lib/transcript.mjs` 신설: `typedText`(metrics에서 옮김) + `humanMessages(lines)` — type=user, isMeta·isCompactSummary 제외, 도구 결과 제외, 직접 친 글만, uuid 중복 제거
  2. `answerBacked(answer, messages)`: 첫 메시지 제외. 답의 숫자(단위 포함)는 모두, 숫자가 없으면 두 글자 이상 낱말의 절반 이상이 사람 메시지에 있어야
  3. `checkConfirmations(prd, lines, id)`: 0034 이상, 애매한 곳 칸의 `(확인됨: 답)`마다 대조 → 문제 목록
  4. `decideEdit`·`checkBeforeStop`이 `transcriptPath`를 받으면 위 검사를 더함. guard·stop-check hook이 입력의 `transcript_path`를 넘김
- **대안·트레이드오프:**
  - 답 문장 전체 일치: 말을 바꿔 적으면 막힘 → 숫자·낱말 기준
  - "(확인 필요)를 적은 뒤에 사람 메시지가 있었나"만 보기: 아무 말이나 오면 통과 → 답 내용까지 대조
  - 게이트에도 걸기: 대화 기록이 저장소에 없음 → hook만
- **파일 계획:** `hooks/lib/{transcript.mjs,transcript.test.mjs,records.mjs,records.test.mjs}`, `hooks/{guard,stop-check}.mjs`, `metrics/lib.mjs`(import 경로), `guardrails.md`, 실험 `runs/SC-*`
- **위험:** 사람이 다른 세션에서 답함 → 막힘(한계에 적음). 낱말 기준이 느슨해 위조가 통과 → 0033 SI-2로 확인
- **검증 계획:** 단위 테스트, 0033 대화 기록 재확인, Haiku 3회

## 계획과 달라진 점

## 검증 결과
