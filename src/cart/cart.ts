import { assertWon, type Won } from "../money.js";

export const MAX_QUANTITY = 99;

export interface LineItem {
  sku: string;
  name: string;
  unitPrice: Won;
  quantity: number;
}

export class CartError extends Error {}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new CartError(`수량은 1 이상 ${MAX_QUANTITY} 이하의 정수여야 합니다: ${quantity}`);
  }
}

export class Cart {
  private readonly lines = new Map<string, LineItem>();

  add(item: LineItem): void {
    assertWon(item.unitPrice, "unitPrice");
    assertQuantity(item.quantity);

    const existing = this.lines.get(item.sku);
    if (!existing) {
      this.lines.set(item.sku, { ...item });
      return;
    }

    const merged = existing.quantity + item.quantity;
    if (merged > MAX_QUANTITY) {
      throw new CartError(`${item.sku}의 수량이 ${MAX_QUANTITY}개를 넘습니다: ${merged}`);
    }
    existing.quantity = merged;
  }

  setQuantity(sku: string, quantity: number): void {
    const line = this.lines.get(sku);
    if (!line) throw new CartError(`장바구니에 없는 상품입니다: ${sku}`);
    assertQuantity(quantity);
    line.quantity = quantity;
  }

  remove(sku: string): void {
    this.lines.delete(sku);
  }

  /** 담은 순서대로 복사본을 돌려준다 (외부에서 수정해도 장바구니에 영향 없음) */
  items(): LineItem[] {
    return [...this.lines.values()].map((line) => ({ ...line }));
  }
}
