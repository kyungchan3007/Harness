// 실험 대상 도메인: 메모 저장소 (의도적으로 작게 유지 — 하네스 실험이 주인공)

export interface Memo {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
}

export class MemoValidationError extends Error {}

export class MemoStore {
  private readonly memos = new Map<string, Memo>();
  private seq = 0;

  constructor(private readonly now: () => Date = () => new Date()) {}

  create(input: { title: string; body?: string }): Memo {
    const title = input.title.trim();
    if (title.length === 0) throw new MemoValidationError("제목은 비어 있을 수 없습니다");
    if (title.length > 100) throw new MemoValidationError("제목은 100자 이하여야 합니다");

    const memo: Memo = {
      id: `memo-${++this.seq}`,
      title,
      body: input.body ?? "",
      createdAt: this.now(),
    };
    this.memos.set(memo.id, memo);
    return memo;
  }

  get(id: string): Memo | undefined {
    return this.memos.get(id);
  }

  list(): Memo[] {
    return [...this.memos.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  remove(id: string): boolean {
    return this.memos.delete(id);
  }
}
