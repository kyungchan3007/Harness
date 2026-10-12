완료되었습니다! 🎉

## 태스크 0034 — 포인트 적립 완료 보고

**최종 상태: ✅ ALL PASS**

### 완성된 기능
- `src/pricing/points.ts`: 포인트 계산 함수
  - 기본 적립률: 1%
  - VIP 회원: 2배 (2%)
  - 쿠폰 사용: 절반 (0.5%, VIP 시 1%)
  - Floor 처리로 정수 반환

### 테스트
- **총 9가지** (138개 테스트 중)
  - 기본 적립 (5), 쿠폰 (1), VIP (1), VIP+쿠폰 (1), 입력 검증 (1)
  - 경계값 포함 (0원, 1원, 99,999원)

### 문서
- **PRD/SDD/Trace**: 스펙 완전 문서화
- **domain.md**: 포인트 규칙 6가지 추가
- **TASKS.md**: 태스크 0034 done 표기

### 검증
```
✅ Typecheck
✅ Unit tests (138 passed)
✅ No npm/yarn lockfiles
✅ Task records
```

커밋: `36c1e14` + `8d6065f`
