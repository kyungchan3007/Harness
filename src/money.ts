/** 원 단위 금액. 항상 0 이상의 정수 (agents/context/domain.md) */
export type Won = number;

export function assertWon(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label}은(는) 0 이상의 정수여야 합니다: ${value}`);
  }
}
